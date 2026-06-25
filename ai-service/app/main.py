from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from app.routes.generate import router as generate_router
from app.config import get_settings
from app.services.db import close_db_pool
import logging

# Image generation — isolated router (no langchain dependency)
try:
    from app.routes.image import router as image_router
    IMAGE_ROUTER_AVAILABLE = True
except Exception as _img_err:
    IMAGE_ROUTER_AVAILABLE = False
    image_router = None
    logging.getLogger(__name__).warning(f"Image router failed to load: {_img_err}")

# Try to import workers (may fail if Redis unavailable)
try:
    from app.workers.carousel_worker import start_worker as start_carousel_worker
    from app.workers.enhancer_worker import start_enhancer_worker
    from app.workers.design_worker import start_design_worker
    from app.workers.export_worker import start_export_worker
    WORKERS_AVAILABLE = True
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Exception during worker import: {e}")
    WORKERS_AVAILABLE = False
    start_carousel_worker = lambda: None
    start_enhancer_worker = lambda: None
    start_design_worker = lambda: None
    start_export_worker = lambda: None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CreatorPulse AI Service",
    description="AI content generation microservice for LinkedIn",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — only backend should call this, but allow flexibility in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(generate_router)
if IMAGE_ROUTER_AVAILABLE and image_router:
    app.include_router(image_router)
    logging.getLogger(__name__).info("✅ Image generation router mounted")


@app.get("/")
async def root():
    """
    CreatorPulse AI Service Root Endpoint.
    Visit /docs for interactive API documentation.
    """
    settings = get_settings()
    return {
        "message": "🧠 CreatorPulse AI Service",
        "version": "1.0.0",
        "model": settings.OPENAI_MODEL,
        "documentation": "http://127.0.0.1:8001/docs",
        "health_check": "http://127.0.0.1:8001/health",
        "status": "ready"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    No authentication required — used by Docker and monitoring.
    """
    settings = get_settings()
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "service": "creatorpulse-ai",
        "model": settings.OPENAI_MODEL,
    }


_workers = []

@app.on_event("startup")
async def startup():
    """Validate configuration on startup."""
    settings = get_settings()  # This will crash if env vars are missing
    logger.info(f"🧠 AI Service starting — model: {settings.OPENAI_MODEL}")
    logger.info(f"📍 Health check: http://localhost:{settings.PORT}/health")
    logger.info(f"📚 API docs: http://localhost:{settings.PORT}/docs")

    # Start BullMQ worker processes (optional — requires Redis)
    global _workers
    if WORKERS_AVAILABLE:
        try:
            _workers = [
                start_carousel_worker(),
                start_enhancer_worker(),
                start_design_worker(),
                start_export_worker()
            ]
            logger.info("✅ BullMQ workers started successfully")
        except Exception as e:
            logger.warning(f"⚠️ BullMQ workers skipped (Redis not available): {str(e)}")
            _workers = []
    else:
        logger.info("ℹ️ BullMQ workers disabled (Redis not configured)")

@app.on_event("shutdown")
async def shutdown():
    """Cleanup resources."""
    logger.info("Shutting down AI service components...")
    for w in _workers:
        await w.close()
    await close_db_pool()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )
