import time
import json
import logging
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.config import get_settings
from app.models.schemas import (
    GenerateRequest,
    GenerateResponse,
    EngagementPrediction,
    AnalyzeTrendsRequest,
    AnalyzeTrendsResponse,
    GenerateHooksRequest,
    GenerateHooksResponse,
)
from app.services.article_scraper import scrape_article

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════
# Prompt Templates
# ═══════════════════════════════════════════

TREND_ANALYSIS_PROMPT = """You are an expert content strategist and trend analyst.
Analyze the following recent articles, news, and social media posts. Identify 3 to 5 distinct, emerging trends or high-value topics for content creation.

RAW CONTENT:
{raw_texts}

REQUIREMENTS:
1. Group similar news items into a single coherent trend.
2. Provide a catchy, concise 'topic' title for each.
3. Write a 1-2 sentence description of what the trend is and why it matters.
4. Extract 3-5 relevant keywords.
5. Assign a 'score' (1-100) based on virality potential.

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{{"topics": [{{"topic": "The exact topic title", "description": "Brief description", "keywords": ["key1", "key2"], "score": 85}}]}}"""


HOOK_GENERATION_PROMPT = """You are an elite copywriter and social media strategist known for viral hooks.
Generate 5 distinct, highly-engaging first lines (hooks) for a post about the following topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SPECIFIC ANGLE/FOCUS: {angle}

VOICE STYLE SAMPLES (match this tone and style):
{voice_samples}

REQUIREMENTS:
1. Each hook must use a different psychological angle (e.g., Bold Claim, Pattern Interrupt, Curiosity Gap, Personal Story, Contrarian View).
2. Keep them short and punchy.
3. Provide a brief reasoning explaining why this specific hook will capture attention.

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{{"hooks": [{{"hook": "The exact hook text", "reasoning": "Why this works"}}]}}"""

LINKEDIN_SHORT_PROMPT = """You are a LinkedIn content strategist who creates viral, engaging posts.
Generate a short LinkedIn post (under 300 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}
CHOSEN HOOK: {hook_text}

VOICE STYLE SAMPLES (match this tone and style):
{voice_samples}

REQUIREMENTS:
1. You MUST start the post EXACTLY with the CHOSEN HOOK. Do not alter it.
2. Use short paragraphs (1-2 sentences each)
3. Add line breaks between paragraphs for readability
4. Include a clear call-to-action at the end (question, ask for opinion, etc.)
5. Suggest 3-5 relevant hashtags
6. Write in first person, conversational tone
7. Make it thought-provoking, not promotional
8. Under 300 words total
9. Use emojis sparingly (1-3 max)

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{{"content": "The full post text with line breaks", "hook": "The CHOSEN HOOK", "hashtags": ["#tag1", "#tag2", "#tag3"]}}"""

LINKEDIN_LONG_PROMPT = """You are a LinkedIn thought leader who creates in-depth, valuable content.
Generate a long-form LinkedIn post (500-800 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}
CHOSEN HOOK: {hook_text}

VOICE STYLE SAMPLES (match this tone and style):
{voice_samples}

REQUIREMENTS:
1. You MUST start the post EXACTLY with the CHOSEN HOOK. Do not alter it.
2. Structure with clear sections and transitions
3. Include personal insights, observations, or lessons learned
4. Use real-world examples or analogies to illustrate points
5. End with a discussion question to drive engagement
6. Suggest 5-7 relevant hashtags
7. Professional but approachable tone — like talking to a smart colleague
8. Between 500-800 words
9. Use emojis for visual breaks (3-5 total)
10. Include a "TL;DR" or key takeaway

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{{"content": "The full post text with line breaks", "hook": "The CHOSEN HOOK", "hashtags": ["#tag1", "#tag2", "#tag3"]}}"""


async def generate_linkedin_content(request: GenerateRequest) -> GenerateResponse:
    """
    Core AI generation pipeline:
    1. Scrape source article (if URL provided)
    2. Select prompt template based on content_type
    3. Format voice samples
    4. Build and invoke LangChain → OpenAI chain
    5. Parse structured JSON response
    6. Return GenerateResponse with metrics
    """
    settings = get_settings()
    start_time = time.time()

    # Step 1: Scrape source article if URL provided
    article_data = {"title": "", "content": "", "word_count": 0}
    if request.trend.source_url:
        logger.info(f"Scraping source article: {request.trend.source_url}")
        article_data = await scrape_article(request.trend.source_url)
        logger.info(f"Scraped {article_data.get('word_count', 0)} words from article")

    # Step 2: Select prompt template
    template = (
        LINKEDIN_SHORT_PROMPT
        if request.content_type == "linkedin_short"
        else LINKEDIN_LONG_PROMPT
    )

    # Step 3: Format voice samples
    if request.voice_samples:
        voice_text = "\n---\n".join(request.voice_samples)
    else:
        voice_text = (
            "No voice samples provided. "
            "Use a professional, authentic LinkedIn tone — "
            "conversational but knowledgeable."
        )

    # Step 4: Build and invoke LLM chain
    prompt = ChatPromptTemplate.from_template(template)
    llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
        max_tokens=2000,
    )

    chain = prompt | llm

    logger.info(f"Generating {request.content_type.value} content for: {request.trend.topic}")

    hook_text = request.hook_text if request.hook_text else "A strong attention grabbing hook."

    result = await chain.ainvoke(
        {
            "topic": request.trend.topic,
            "description": request.trend.description,
            "article_content": article_data.get(
                "content", "No article content available."
            ),
            "hook_text": hook_text,
            "voice_samples": voice_text,
        }
    )

    # Step 5: Parse LLM response
    try:
        parsed = _parse_json_response(result.content)
        if not parsed:
            raise ValueError("Empty JSON parsed")
    except Exception:
        logger.warning("LLM returned non-JSON response, using raw content")
        parsed = {
            "content": result.content,
            "hook": result.content.split("\n")[0] if result.content else "",
            "hashtags": [],
        }

    processing_time = int((time.time() - start_time) * 1000)

    # Extract token usage from response metadata
    tokens = 0
    if hasattr(result, "response_metadata"):
        token_usage = result.response_metadata.get("token_usage", {})
        tokens = token_usage.get("total_tokens", 0)

    logger.info(
        f"Generated content: {len(parsed.get('content', ''))} chars, "
        f"{tokens} tokens, {processing_time}ms"
    )

    return GenerateResponse(
        content=parsed.get("content", ""),
        hook=parsed.get("hook", ""),
        hashtags=parsed.get("hashtags", []),
        engagement_prediction=EngagementPrediction(
            estimated_likes=30,
            estimated_comments=5,
            estimated_shares=2,
            confidence=0.6,
        ),
        ai_model_version=settings.OPENAI_MODEL,
        tokens_consumed=tokens,
        processing_time_ms=processing_time,
    )


def _parse_json_response(content: str) -> dict:
    """Helper to safely parse JSON from LLM response."""
    try:
        response_text = content.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        return json.loads(response_text)
    except Exception as e:
        logger.warning(f"Failed to parse LLM JSON: {e}")
        return {}


async def analyze_trends(request: AnalyzeTrendsRequest) -> AnalyzeTrendsResponse:
    """Analyzes raw aggregated texts to identify distinct content topics."""
    settings = get_settings()
    start_time = time.time()
    
    prompt = ChatPromptTemplate.from_template(TREND_ANALYSIS_PROMPT)
    llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.4,
    )
    chain = prompt | llm
    
    raw_texts_combined = "\n\n---\n\n".join(request.raw_texts)
    # Truncate to avoid massive token bills if there's too much data
    if len(raw_texts_combined) > 20000:
        raw_texts_combined = raw_texts_combined[:20000] + "\n[Content truncated...]"

    logger.info(f"Analyzing trends from {len(request.raw_texts)} text blocks.")
    
    result = await chain.ainvoke({"raw_texts": raw_texts_combined})
    parsed = _parse_json_response(result.content)
    
    topics = parsed.get("topics", [])
    processing_time = int((time.time() - start_time) * 1000)
    tokens = result.response_metadata.get("token_usage", {}).get("total_tokens", 0) if hasattr(result, "response_metadata") else 0
    
    return AnalyzeTrendsResponse(
        topics=topics,
        tokens_consumed=tokens,
        processing_time_ms=processing_time,
    )


async def generate_hooks(request: GenerateHooksRequest) -> GenerateHooksResponse:
    """Generates 5 distinct hooks for a given topic."""
    settings = get_settings()
    start_time = time.time()
    
    prompt = ChatPromptTemplate.from_template(HOOK_GENERATION_PROMPT)
    llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.8, # Higher temp for more creative hooks
    )
    chain = prompt | llm
    
    voice_text = "\n---\n".join(request.voice_samples) if request.voice_samples else "Professional and conversational."
    angle = request.angle if request.angle else "General insightful observation."
    
    logger.info(f"Generating hooks for topic: {request.trend.topic}")
    
    result = await chain.ainvoke({
        "topic": request.trend.topic,
        "description": request.trend.description,
        "angle": angle,
        "voice_samples": voice_text,
    })
    
    parsed = _parse_json_response(result.content)
    hooks = parsed.get("hooks", [])
    
    # Fallback if parsing fails
    if not hooks:
        hooks = [{"hook": f"Why you need to care about {request.trend.topic}", "reasoning": "Fallback hook"}]
        
    processing_time = int((time.time() - start_time) * 1000)
    tokens = result.response_metadata.get("token_usage", {}).get("total_tokens", 0) if hasattr(result, "response_metadata") else 0
    
    return GenerateHooksResponse(
        hooks=hooks,
        tokens_consumed=tokens,
        processing_time_ms=processing_time,
    )
