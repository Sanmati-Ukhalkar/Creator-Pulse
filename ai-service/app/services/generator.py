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
)
from app.services.article_scraper import scrape_article

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════
# LinkedIn Prompt Templates
# ═══════════════════════════════════════════

LINKEDIN_SHORT_PROMPT = """You are a LinkedIn content strategist who creates viral, engaging posts.
Generate a short LinkedIn post (under 300 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}

VOICE STYLE SAMPLES (match this tone and style):
{voice_samples}

REQUIREMENTS:
1. Start with a strong hook — the first line MUST grab attention (pattern interrupt, bold claim, or question)
2. Use short paragraphs (1-2 sentences each)
3. Add line breaks between paragraphs for readability
4. Include a clear call-to-action at the end (question, ask for opinion, etc.)
5. Suggest 3-5 relevant hashtags
6. Write in first person, conversational tone
7. Make it thought-provoking, not promotional
8. Under 300 words total
9. Use emojis sparingly (1-3 max)

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{{"content": "The full post text with line breaks", "hook": "The first attention-grabbing line", "hashtags": ["#tag1", "#tag2", "#tag3"]}}"""

LINKEDIN_LONG_PROMPT = """You are a LinkedIn thought leader who creates in-depth, valuable content.
Generate a long-form LinkedIn post (500-800 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}

VOICE STYLE SAMPLES (match this tone and style):
{voice_samples}

REQUIREMENTS:
1. Start with a compelling hook that creates curiosity
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
{{"content": "The full post text with line breaks", "hook": "The first attention-grabbing line", "hashtags": ["#tag1", "#tag2", "#tag3"]}}"""


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

    result = await chain.ainvoke(
        {
            "topic": request.trend.topic,
            "description": request.trend.description,
            "article_content": article_data.get(
                "content", "No article content available."
            ),
            "voice_samples": voice_text,
        }
    )

    # Step 5: Parse LLM response
    try:
        # Try to extract JSON from the response
        response_text = result.content.strip()
        # Handle case where LLM wraps JSON in markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        parsed = json.loads(response_text)
    except json.JSONDecodeError:
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
