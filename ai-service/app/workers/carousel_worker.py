import asyncio
import logging
import json
import os
from bullmq import Worker, Job, FlowProducer
from app.config import get_settings
from app.services.db import get_db_pool
from app.models.carousel import ContentBrainOutput, CarouselPlannerOutput
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

def load_prompt(filename: str) -> str:
    prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', filename)
    with open(prompt_path, 'r', encoding='utf-8') as f:
        return f.read()

async def process_carousel_job(job: Job, token: str):
    logger.info(f"Processing job {job.id} for topic: {job.data.get('topic')}")
    settings = get_settings()
    pool = await get_db_pool()
    topic = job.data['topic']
    job_id = job.data['jobId']
    
    # Init LLMs
    llm_mini = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, model_kwargs={"response_format": {"type": "json_object"}})
    llm_strong = ChatOpenAI(model="gpt-4o", temperature=0.7, model_kwargs={"response_format": {"type": "json_object"}})

    async with pool.acquire() as conn:
        try:
            # Step A: Content Brain
            await conn.execute("UPDATE carousel_jobs SET status = 'brain' WHERE id = $1", job_id)
            brain_prompt = load_prompt("content_brain.txt")
            
            res_brain = await llm_mini.ainvoke([
                SystemMessage(content=brain_prompt),
                HumanMessage(content=f"Topic: {topic}")
            ])
            brain_parsed = ContentBrainOutput.model_validate_json(res_brain.content)
            
            await conn.execute("""
                UPDATE carousel_jobs 
                SET angle = $1, tone = $2, target_audience = $3 
                WHERE id = $4
            """, brain_parsed.angle, brain_parsed.tone, brain_parsed.target_audience, job_id)

            # Step B: Carousel Planner
            await conn.execute("UPDATE carousel_jobs SET status = 'planning' WHERE id = $1", job_id)
            planner_prompt = load_prompt("carousel_planner.txt")
            
            if job.name == 'generate-smart':
                slide_count = job.data.get('slide_count', 6)
                planner_prompt = planner_prompt.replace("5-6 slide narrative sequence", f"exactly {slide_count} slide narrative sequence")
            
            planner_context = f"Topic: {topic}\nAngle: {brain_parsed.angle}\nTone: {brain_parsed.tone}\nAudience: {brain_parsed.target_audience}"
            res_planner = await llm_strong.ainvoke([
                SystemMessage(content=planner_prompt),
                HumanMessage(content=planner_context)
            ])
            planner_parsed = CarouselPlannerOutput.model_validate_json(res_planner.content)

            # Insert slides
            slide_ids = []
            for slide in planner_parsed.slides:
                row = await conn.fetchrow("""
                    INSERT INTO carousel_slides (job_id, slide_order, slide_type, idea)
                    VALUES ($1, $2, $3, $4) RETURNING id
                """, job_id, slide.slide_order, slide.slide_type, slide.idea)
                slide_ids.append({"id": str(row['id']), "idea": slide.idea, "type": slide.slide_type})
            
            # Step C Transition
            await conn.execute("UPDATE carousel_jobs SET status = 'enhancing' WHERE id = $1", job_id)
            logger.info(f"Phase 3 completed for job {job_id}. Activating Step C fan-out via FlowProducer.")
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {str(e)}")
            await conn.execute("UPDATE carousel_jobs SET status = 'failed' WHERE id = $1", job_id)
            raise e

    # Dispatch FlowProducer OUTSIDE of the DB transaction pool so we don't hold the connection
    try:
        flow_producer = FlowProducer({"connection": settings.REDIS_URL})
        children_jobs = []
        for s in slide_ids:
            children_jobs.append({
                "name": "enhance-slide",
                "queueName": "enhancer-jobs",
                "data": {
                    "jobId": str(job_id),
                    "slideId": s["id"],
                    "idea": s["idea"],
                    "type": s["type"]
                }
            })

        await flow_producer.add({
            "name": "design-carousel",
            "queueName": "design-jobs",
            "data": {"jobId": str(job_id)},
            "children": children_jobs
        })
        logger.info(f"FlowProducer successfully dispatched {len(children_jobs)} children for job {job_id}")
    except Exception as e:
        logger.error(f"FlowProducer dispatch failed for job {job_id}: {str(e)}")
        raise e

def start_worker():
    settings = get_settings()
    logger.info("Initializing BullMQ Worker")
    
    worker = Worker(
        "carousel-jobs",
        process_carousel_job,
        {"connection": settings.REDIS_URL}
    )
    return worker
