import os
import aiohttp
import img2pdf
import logging
import asyncio
import json
import zipfile
from bullmq import Worker, Job
from app.config import get_settings
from app.services.db import get_db_pool

logger = logging.getLogger(__name__)

# In docker-compose, render-service runs on host 'render-service'
RENDER_API_URL = os.getenv("RENDER_API_URL", "http://render-service:5000/render")
STORAGE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage"))
PNG_DIR = os.path.join(STORAGE_ROOT, "png_slides")
EXPORT_DIR = os.path.join(STORAGE_ROOT, "carousel_exports")

os.makedirs(PNG_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

async def trigger_render(session, slide):
    # Parse elements gracefully
    try:
        elements = json.loads(slide['elements']) if slide['elements'] else []
    except:
        elements = []

    payload = {
        "jobId": str(slide['job_id']),
        "slideId": str(slide['id']),
        "headline": slide['headline'],
        "subtext": slide['subtext'],
        "visual_description": slide['visual_description'],
        "layout": slide['layout'],
        "color_scheme": slide['color_scheme'],
        "font_size": slide['font_size'],
        "elements": elements
    }
    
    async with session.post(RENDER_API_URL, json=payload) as response:
        if response.status != 200:
            err = await response.text()
            raise Exception(f"Render API failed: {err}")
        return await response.json()

async def form_pdf_and_zip(job_id, slide_paths) -> tuple[str, str]:
    # Zip
    zip_filename = f"{job_id}.zip"
    zip_path = os.path.join(EXPORT_DIR, zip_filename)
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for idx, path in enumerate(slide_paths):
            zf.write(path, arcname=f"slide_{idx+1}.png")
            
    # PDF
    pdf_filename = f"{job_id}.pdf"
    pdf_path = os.path.join(EXPORT_DIR, pdf_filename)
    with open(pdf_path, 'wb') as f:
        f.write(img2pdf.convert(slide_paths))
        
    return pdf_filename, zip_filename

async def process_export_job(job: Job, token: str):
    logger.info(f"Phase 6: Export job pulling for rendering and packaging: {job.data['jobId']}")
    pool = await get_db_pool()
    job_id = job.data['jobId']
    
    async with pool.acquire() as conn:
        try:
            # Render Step Transition
            await conn.execute("UPDATE carousel_jobs SET status = 'rendering' WHERE id = $1", job_id)
            slides = await conn.fetch("SELECT * FROM carousel_slides WHERE job_id = $1 ORDER BY slide_order ASC", job_id)
            
            slide_paths = []
            async with aiohttp.ClientSession() as session:
                tasks = [trigger_render(session, dict(s)) for s in slides]
                results = await asyncio.gather(*tasks)
                for res in results:
                    slide_paths.append(res['path'])
                    
            # Export Transition
            await conn.execute("UPDATE carousel_jobs SET status = 'exporting' WHERE id = $1", job_id)
            pdf_path, zip_path = await form_pdf_and_zip(job_id, slide_paths)
            
            # DB insert
            await conn.execute("""
                INSERT INTO carousel_exports (job_id, pdf_storage_path, zip_storage_path)
                VALUES ($1, $2, $3)
            """, job_id, pdf_path, zip_path)
            
            # Integrate to Drafts (Fake placeholder for MVP mapping)
            job_info = await conn.fetchrow("SELECT user_id, topic FROM carousel_jobs WHERE id = $1", job_id)
            try:
                await conn.execute("""
                    INSERT INTO drafts (user_id, status, content, platform)
                    VALUES ($1, 'draft', $2, 'linkedin')
                """, job_info['user_id'], f"[Carousel Draft] {job_info['topic']}")
            except Exception as ex:
                logger.warning(f"Drafts table strict mapping mismatch, skipping fake draft push: {ex}")
                
            await conn.execute("UPDATE carousel_jobs SET status = 'done', completed_at = now() WHERE id = $1", job_id)
            logger.info(f"Phase 6 Finalized. Job {job_id} is DONE.")
            
        except Exception as e:
            logger.error(f"Job {job_id} Export Failed: {str(e)}")
            await conn.execute("UPDATE carousel_jobs SET status = 'failed' WHERE id = $1", job_id)
            # Refund quota via Redis
            import redis.asyncio as aioredis
            settings = get_settings()
            r = aioredis.from_url(settings.REDIS_URL)
            if job_info and job_info.get('user_id'):
                from datetime import datetime, timezone
                today = datetime.now(timezone.utc).isoformat().split('T')[0]
                await r.decr(f"carousel_quota:{job_info['user_id']}:{today}")
            raise e

    return True

def start_export_worker():
    settings = get_settings()
    logger.info("Initializing BullMQ Export Worker")
    worker = Worker(
        "export-jobs",
        process_export_job,
        {"connection": settings.REDIS_URL}
    )
    return worker
