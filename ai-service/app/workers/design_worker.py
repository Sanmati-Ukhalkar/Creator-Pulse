import logging
import json
from bullmq import Worker, Job
from app.config import get_settings
from app.services.db import get_db_pool

logger = logging.getLogger(__name__)

def get_layout_for_type(slide_type: str) -> str:
    mapping = {
        "hook": "centered_bold",
        "insight": "left_heavy",
        "stat": "centered_minimal",
        "cta": "centered_action",
        "example": "split_view",
        "comparison": "split_view"
    }
    return mapping.get(slide_type, "centered_bold")

def get_font_size(headline: str) -> str:
    word_count = len(headline.split())
    if word_count <= 3: return "large"
    if word_count <= 6: return "medium"
    return "small"

def get_elements_from_desc(desc: str) -> list:
    desc_lower = desc.lower()
    elements = []
    if "chart" in desc_lower: elements.append("bar_chart_placeholder")
    if "stat" in desc_lower or "number" in desc_lower: elements.append("big_number")
    if "list" in desc_lower or "bullet" in desc_lower: elements.append("icon_bullets")
    return elements

async def process_design_job(job: Job, token: str):
    logger.info(f"Designing carousel job {job.data['jobId']}")
    pool = await get_db_pool()
    job_id = job.data['jobId']
    
    async with pool.acquire() as conn:
        # FlowProducer guarantees this only runs after ALL child enhancer jobs are done
        await conn.execute("UPDATE carousel_jobs SET status = 'designing' WHERE id = $1", job_id)
        
        # Get Slides
        slides = await conn.fetch("SELECT id, slide_type, headline, visual_description FROM carousel_slides WHERE job_id = $1 ORDER BY slide_order ASC", job_id)
        
        for slide in slides:
            headline = slide['headline'] or ""
            desc = slide['visual_description'] or ""
            
            layout = get_layout_for_type(slide['slide_type'])
            font_size = get_font_size(headline)
            elements = get_elements_from_desc(desc)
            
            color_scheme = "dark_modern" 
            
            await conn.execute("""
                UPDATE carousel_slides 
                SET layout = $1, font_size = $2, elements = $3, color_scheme = $4 
                WHERE id = $5
            """, layout, font_size, json.dumps(elements), color_scheme, slide['id'])
            
        await conn.execute("UPDATE carousel_jobs SET status = 'rendering' WHERE id = $1", job_id)
        
        # Dispatch Export/Render pipeline
        from bullmq import Queue
        settings = get_settings()
        export_q = Queue("export-jobs", {"connection": settings.REDIS_URL})
        await export_q.add("export-carousel", {"jobId": str(job_id)})
        
        logger.info(f"Phase 4 Design completed for job {job_id}. Dispatched to Export/Render.")
    
    return True

def start_design_worker():
    settings = get_settings()
    logger.info("Initializing BullMQ Design Worker")
    
    worker = Worker(
        "design-jobs",
        process_design_job,
        {"connection": settings.REDIS_URL}
    )
    return worker
