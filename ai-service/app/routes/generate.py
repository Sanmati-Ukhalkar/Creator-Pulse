from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    GenerateRequest, 
    GenerateResponse,
    AnalyzeTrendsRequest,
    AnalyzeTrendsResponse,
    GenerateHooksRequest,
    GenerateHooksResponse
)
from app.services.generator import (
    generate_linkedin_content,
    analyze_trends,
    generate_hooks
)
from app.dependencies import verify_api_key
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate_content(
    request: GenerateRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Generate LinkedIn content from a trend.
    
    Requires X-API-Key header for authentication (backend-only).
    Accepts trend data + optional voice samples, returns structured LinkedIn post.
    """
    try:
        logger.info(
            f"Generation request: type={request.content_type.value}, "
            f"topic='{request.trend.topic[:50]}...'"
        )
        result = await generate_linkedin_content(request)
        logger.info(
            f"Generation complete: {len(result.content)} chars, "
            f"{result.tokens_consumed} tokens, {result.processing_time_ms}ms"
        )
        return result
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Content generation failed: {str(e)}",
        )


@router.post("/analyze-trends", response_model=AnalyzeTrendsResponse)
async def api_analyze_trends(
    request: AnalyzeTrendsRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Analyze raw aggregated texts to identify distinct content topics.
    """
    try:
        logger.info(f"Trend analysis request: {len(request.raw_texts)} items")
        result = await analyze_trends(request)
        return result
    except Exception as e:
        logger.error(f"Trend analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Trend analysis failed: {str(e)}",
        )


@router.post("/generate-hooks", response_model=GenerateHooksResponse)
async def api_generate_hooks(
    request: GenerateHooksRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Generates 5 distinct hooks for a given topic.
    """
    try:
        logger.info(f"Hook generation request for topic: '{request.trend.topic[:50]}'")
        result = await generate_hooks(request)
        return result
    except Exception as e:
        logger.error(f"Hook generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Hook generation failed: {str(e)}",
        )
