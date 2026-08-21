import time
import base64
import logging
from urllib.parse import quote

import httpx
from openai import AsyncOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)


# ─── Prompt Concept Extractor ────────────────────────────────────────────────

VISUAL_CONCEPT_PROMPT = """You are a world-class visual art director creating LinkedIn banner images.

Given the post topic and post content below, craft a HIGHLY SPECIFIC image generation prompt (max 55 words) for a professional LinkedIn banner.

Topic: {topic}

Post Content:
{post_text}

Your prompt MUST include ALL of the following:
1. The CORE VISUAL SUBJECT — a specific metaphor or abstract concept that represents this exact topic
2. STYLE — e.g. "digital art", "cinematic photography", "3D render", "flat design illustration", "oil painting"
3. MOOD & LIGHTING — e.g. "warm golden hour light", "cool blue ambient glow", "dramatic chiaroscuro"
4. COLOR PALETTE — 2-3 specific colors that match the topic's tone
5. COMPOSITION NOTE — e.g. "wide landscape view", "macro close-up", "bird's eye perspective"

Rules:
- NO text, NO logos, NO people's faces, NO LinkedIn branding
- Make it DIRECTLY relevant to the topic — not generic business imagery
- Professional, polished, suitable for LinkedIn

Return ONLY the image prompt. No explanation, no labels, no punctuation outside the prompt."""


async def _extract_visual_concept(post_text: str, topic: str) -> str:
    """Use gpt-4o-mini to extract a rich, structured visual prompt from post text and topic."""
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # Use up to 1200 chars of post text for better context
    truncated_post = post_text[:1200] if len(post_text) > 1200 else post_text

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": VISUAL_CONCEPT_PROMPT.format(
                topic=topic,
                post_text=truncated_post
            )}
        ],
        temperature=0.75,
        max_tokens=120,
    )
    concept = response.choices[0].message.content.strip()
    logger.info(f"Extracted visual concept for topic '{topic[:40]}': {concept[:100]}...")
    return concept


# ─── Pollinations AI (Free, No Key Required) ─────────────────────────────────

async def generate_with_pollinations(post_text: str, topic: str, seed: int = 42) -> dict:
    """
    Generate an image using Pollinations AI (Flux model, completely free).
    Returns base64-encoded JPEG + the prompt used.
    """
    start = time.time()

    # Extract a rich, topic-aware visual concept from the actual post text
    concept = await _extract_visual_concept(post_text, topic)

    # Build the full Pollinations prompt — include topic explicitly for extra grounding
    full_prompt = (
        f"{concept}, "
        f"ultra high quality, 4K resolution, sharp focus, "
        f"professional LinkedIn banner, no text, no watermark"
    )

    encoded_prompt = quote(full_prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?width=1216&height=832&model=flux&seed={seed}&nologo=true&enhance=true&safe=false"
    )

    logger.info(f"Generating image with Pollinations Flux (seed={seed}) | prompt: {full_prompt[:120]}...")

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()
        image_bytes = response.content

    b64 = base64.b64encode(image_bytes).decode("utf-8")
    processing_ms = int((time.time() - start) * 1000)

    logger.info(f"Pollinations image generated: {len(image_bytes)} bytes in {processing_ms}ms")

    return {
        "image_b64": b64,
        "format": "jpeg",
        "width": 1216,
        "height": 832,
        "provider": "pollinations",
        "prompt_used": full_prompt,
        "processing_time_ms": processing_ms,
    }



# ─── Gemini (Free with API Key, ~500/day) ────────────────────────────────────

async def generate_with_gemini(post_text: str, topic: str) -> dict:
    """
    Generate an image using Google Gemini (gemini-2.5-flash-image).
    Returns base64-encoded image + the prompt used.
    Requires GEMINI_API_KEY in .env
    """
    settings = get_settings()

    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in .env")

    start = time.time()

    try:
        from google import genai as google_genai
    except ImportError:
        raise ImportError(
            "google-genai is not installed. Run: pip install google-genai"
        )

    # Use the same rich, topic-aware concept extractor
    concept = await _extract_visual_concept(post_text, topic)
    full_prompt = (
        f"{concept}. "
        f"Ultra high quality, 16:9 aspect ratio. No text overlays. No people's faces. No watermarks."
    )

    logger.info("Generating image with Gemini Flash Image")

    client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=full_prompt,
    )

    image_b64 = None
    image_format = "jpeg"

    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            raw_bytes = part.inline_data.data
            # inline_data.data may already be bytes or base64 string
            if isinstance(raw_bytes, bytes):
                image_b64 = base64.b64encode(raw_bytes).decode("utf-8")
            else:
                image_b64 = raw_bytes  # already b64
            mime = getattr(part.inline_data, "mime_type", "image/jpeg")
            image_format = mime.split("/")[-1]
            break

    if not image_b64:
        raise ValueError("Gemini returned no image data")

    processing_ms = int((time.time() - start) * 1000)
    logger.info(f"Gemini image generated in {processing_ms}ms")

    return {
        "image_b64": image_b64,
        "format": image_format,
        "width": 1216,
        "height": 832,
        "provider": "gemini",
        "prompt_used": full_prompt,
        "processing_time_ms": processing_ms,
    }


# ─── Main Dispatcher ─────────────────────────────────────────────────────────

async def generate_post_image(
    post_text: str,
    topic: str,
    provider: str = "pollinations",
    seed: int = 42,
) -> dict:
    """
    Main entry point. Routes to the correct provider.

    Args:
        post_text: The full generated LinkedIn post text (used to extract visual concept)
        topic: The trend topic title
        provider: 'pollinations' (free, no key) | 'gemini' (free with key)
        seed: Seed for Pollinations (change to regenerate different variation)

    Returns:
        dict with image_b64, format, provider, prompt_used, processing_time_ms
    """
    if provider == "gemini":
        return await generate_with_gemini(post_text, topic)
    else:
        return await generate_with_pollinations(post_text, topic, seed=seed)
