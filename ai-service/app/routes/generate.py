from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import (
    GenerateRequest, 
    GenerateResponse,
    AnalyzeTrendsRequest,
    AnalyzeTrendsResponse,
    GenerateHooksRequest,
    GenerateHooksResponse,
    GenerateListeningQueriesRequest,
    GenerateListeningQueriesResponse,
    ImageGenerateRequest,
    ImageGenerateResponse,
)
from app.services.generator import (
    generate_linkedin_content,
    stream_linkedin_content,
    stream_ensemble_content,
    analyze_trends,
    generate_hooks,
    generate_listening_queries
)
from app.services.image_generator import generate_post_image
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
    Accepts trend data, returns structured LinkedIn post.
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

@router.post("/generate-stream")
async def generate_content_stream(
    request: GenerateRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Streams LinkedIn content from a trend.
    """
    logger.info(
        f"Stream generation request: type={request.content_type.value}, "
        f"topic='{request.trend.topic[:50]}...', ensemble={request.use_ensemble}"
    )
    
    if request.use_ensemble:
        generator_func = stream_ensemble_content(request)
    else:
        generator_func = stream_linkedin_content(request)
        
    return StreamingResponse(
        generator_func,
        media_type="application/x-ndjson"
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


@router.post("/generate-image", response_model=ImageGenerateResponse)
async def api_generate_image(
    request: ImageGenerateRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Generate a professional LinkedIn banner image based on post text.

    Supports two providers:
    - 'pollinations': Free, no API key required. Powered by Flux.
    - 'gemini': Free with GEMINI_API_KEY. Powered by Gemini 2.5 Flash Image.

    Change 'seed' to regenerate a different variation with Pollinations.
    Returns base64-encoded image data + the prompt that was used.
    """
    try:
        logger.info(
            f"Image generation request: provider={request.provider}, "
            f"topic='{request.topic[:50]}', seed={request.seed}"
        )
        result = await generate_post_image(
            post_text=request.post_text,
            topic=request.topic,
            provider=request.provider,
            seed=request.seed,
        )
        logger.info(
            f"Image generated: provider={result['provider']}, "
            f"{len(result['image_b64'])} b64 chars, {result['processing_time_ms']}ms"
        )
        return ImageGenerateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed: {str(e)}"
        )

@router.post("/generate-queries", response_model=GenerateListeningQueriesResponse)
async def api_generate_queries(
    request: GenerateListeningQueriesRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Generates optimal search queries for finding live data in a specific niche.
    """
    try:
        return await generate_listening_queries(request)
    except Exception as e:
        logger.error(f"Error generating listening queries: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Query generation failed: {str(e)}",
        )
