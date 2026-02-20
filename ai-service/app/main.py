from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from app.routes.generate import router as generate_router
from app.config import get_settings
import logging

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


@app.on_event("startup")
async def startup():
    """Validate configuration on startup."""
    settings = get_settings()  # This will crash if env vars are missing
    logger.info(f"🧠 AI Service starting — model: {settings.OPENAI_MODEL}")
    logger.info(f"📍 Health check: http://localhost:{settings.PORT}/health")
    logger.info(f"📚 API docs: http://localhost:{settings.PORT}/docs")


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )
