"""
Standalone image generation route.
Isolated from generator.py to avoid langchain dependency issues.
"""
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import ImageGenerateRequest, ImageGenerateResponse
from app.services.image_generator import generate_post_image
from app.dependencies import verify_api_key
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


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
        logger.error(f"Image generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed: {str(e)}",
        )
