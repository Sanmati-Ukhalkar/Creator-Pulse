import logging
import os
from bullmq import Worker, Job
from app.config import get_settings
from app.services.db import get_db_pool
from app.models.carousel import SlideEnhancerOutput
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

def load_prompt() -> str:
    prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'slide_enhancer.txt')
    with open(prompt_path, 'r', encoding='utf-8') as f:
        return f.read()

async def process_enhancer_job(job: Job, token: str):
    logger.info(f"Enhancing slide {job.data['slideId']}")
    pool = await get_db_pool()
    slide_id = job.data['slideId']
    idea = job.data['idea']
    slide_type = job.data['type']
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, model_kwargs={"response_format": {"type": "json_object"}})
    
    prompt = load_prompt()
    res = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"Idea: {idea}\nSlide Type: {slide_type}")
    ])
    
    parsed = SlideEnhancerOutput.model_validate_json(res.content)
    
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE carousel_slides 
            SET headline = $1, subtext = $2, visual_description = $3, render_status = 'pending'
            WHERE id = $4
        """, parsed.headline, parsed.subtext, parsed.visual_description, slide_id)
        
    logger.info(f"Slide {slide_id} enhanced.")
    return True

def start_enhancer_worker():
    settings = get_settings()
    logger.info("Initializing BullMQ Enhancer Worker")
    
    worker = Worker(
        "enhancer-jobs",
        process_enhancer_job,
        {"connection": settings.REDIS_URL, "concurrency": 6}
    )
    return worker
