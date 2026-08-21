from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
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
    generate_listening_queries,
)
from app.services.image_generator import generate_post_image
from app.dependencies import verify_api_key
from app.config import get_settings
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Generate LinkedIn Post ────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_content(
    request: GenerateRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Generate LinkedIn content from a trend.
    Requires X-API-Key header for authentication (backend-only).
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
    """Streams LinkedIn content from a trend."""
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


# ── Analyze Trends ────────────────────────────────────────────────────────────

@router.post("/analyze-trends", response_model=AnalyzeTrendsResponse)
async def api_analyze_trends(
    request: AnalyzeTrendsRequest,
    _api_key: str = Depends(verify_api_key),
):
    """Analyze raw aggregated texts to identify distinct content topics."""
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


# ── Generate Hooks ────────────────────────────────────────────────────────────

@router.post("/generate-hooks", response_model=GenerateHooksResponse)
async def api_generate_hooks(
    request: GenerateHooksRequest,
    _api_key: str = Depends(verify_api_key),
):
    """Generates 5 distinct hooks for a given topic."""
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


# ── Generate Image ────────────────────────────────────────────────────────────

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


# ── Generate Listening Queries ────────────────────────────────────────────────

@router.post("/generate-queries", response_model=GenerateListeningQueriesResponse)
async def api_generate_queries(
    request: GenerateListeningQueriesRequest,
    _api_key: str = Depends(verify_api_key),
):
    """Generates optimal search queries for finding live data in a specific niche."""
    try:
        return await generate_listening_queries(request)
    except Exception as e:
        logger.error(f"Error generating listening queries: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Query generation failed: {str(e)}",
        )


# ── Generate Carousel ─────────────────────────────────────────────────────────
# Called synchronously by the Node.js carousel.worker.ts when a job is dequeued.
# Returns { slides: [{title, body, visual_hint}] } — the exact shape the worker expects.

class CarouselGenerateRequest(BaseModel):
    topic: str
    slide_count: Optional[int] = 6


class SlideOut(BaseModel):
    title: str
    body: str
    visual_hint: str


class CarouselGenerateResponse(BaseModel):
    slides: List[SlideOut]


_CAROUSEL_SYSTEM_PROMPT = """You are an expert LinkedIn carousel content creator.
Given a topic or source text, create engaging, professional LinkedIn carousel slides.
Return a JSON object with a "slides" array. Each slide MUST have exactly these keys:
  - "title": Short, punchy headline (max 12 words, no punctuation at end)
  - "body": 2-4 sentences of practical, insightful content for LinkedIn professionals
  - "visual_hint": Brief description of the ideal visual for this slide (max 15 words, no text/logos)

Rules:
- Slide 1: Powerful hook that grabs attention immediately
- Middle slides: Mix of insights, examples, statistics, and actionable tips
- Last slide: Clear, compelling call-to-action
- Tone: Authoritative, conversational, LinkedIn-professional
- Return ONLY valid JSON with the "slides" key — no markdown, no explanation"""


@router.post("/generate-carousel", response_model=CarouselGenerateResponse)
async def api_generate_carousel(
    request: CarouselGenerateRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Synchronous carousel slide generation.
    Called by the Node.js carousel.worker.ts — returns structured slide data.
    """
    from openai import AsyncOpenAI

    settings = get_settings()
    slide_count = max(4, min(10, request.slide_count or 6))

    try:
        logger.info(
            f"Carousel generation: topic='{request.topic[:60]}', slides={slide_count}"
        )

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        user_prompt = (
            f"Create exactly {slide_count} LinkedIn carousel slides about the following topic/content:\n\n"
            f"{request.topic[:3000]}\n\n"
            f"Return a JSON object with a 'slides' array containing exactly {slide_count} slide objects, "
            f"each with 'title', 'body', and 'visual_hint' keys."
        )

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _CAROUSEL_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.75,
            max_tokens=3000,
            timeout=90,
        )

        raw_content = response.choices[0].message.content or "{}"
        parsed = json.loads(raw_content)
        slides_raw = parsed.get("slides", [])

        if not slides_raw:
            raise ValueError("OpenAI returned an empty slides array")

        slides: List[SlideOut] = []
        for s in slides_raw[:slide_count]:
            slides.append(SlideOut(
                title=str(s.get("title", "Untitled"))[:120],
                body=str(s.get("body", ""))[:600],
                visual_hint=str(s.get("visual_hint", "Abstract professional background"))[:200],
            ))

        logger.info(f"Carousel generation complete: {len(slides)} slides")
        return CarouselGenerateResponse(slides=slides)

    except Exception as e:
        logger.error(f"Carousel generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Carousel generation failed: {str(e)}",
        )
