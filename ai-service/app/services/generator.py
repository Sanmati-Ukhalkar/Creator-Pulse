import time
import json
import logging
import asyncio
from duckduckgo_search import DDGS
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
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
    GenerateListeningQueriesRequest,
    GenerateListeningQueriesResponse,
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
{{"topics": [{{"topic": "The exact topic title", "description": "Brief description", "keywords": ["key1", "key2"], "score": 85, "confidence_score": 90}}]}}"""


HOOK_GENERATION_PROMPT = """You are an elite copywriter and social media strategist known for viral hooks.
Generate 5 distinct, highly-engaging first lines (hooks) for a post about the following topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SPECIFIC ANGLE/FOCUS: {angle}


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

STREAM_LINKEDIN_SHORT_PROMPT = """You are a LinkedIn content strategist who creates viral, engaging posts.
Generate a short LinkedIn post (under 300 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}
CHOSEN HOOK: {hook_text}

REQUIREMENTS:
1. You MUST start the post EXACTLY with the CHOSEN HOOK. Do not alter it.
2. Use short paragraphs (1-2 sentences each)
3. Add line breaks between paragraphs for readability
4. Include a clear call-to-action at the end (question, ask for opinion, etc.)
5. Suggest 3-5 relevant hashtags at the bottom
6. Write in first person, conversational tone
7. Make it thought-provoking, not promotional
8. Under 300 words total
9. Use emojis sparingly (1-3 max)

OUTPUT FORMAT:
Respond with JUST the raw post text and hashtags at the bottom. Do NOT use JSON formatting, markdown code blocks, or any other wrapper. Just the raw text."""

STREAM_LINKEDIN_LONG_PROMPT = """You are a LinkedIn thought leader who creates in-depth, valuable content.
Generate a long-form LinkedIn post (500-800 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}
CHOSEN HOOK: {hook_text}

REQUIREMENTS:
1. You MUST start the post EXACTLY with the CHOSEN HOOK. Do not alter it.
2. Structure with clear sections and transitions
3. Include personal insights, observations, or lessons learned
4. Use real-world examples or analogies to illustrate points
5. End with a discussion question to drive engagement
6. Suggest 5-7 relevant hashtags at the bottom
7. Professional but approachable tone — like talking to a smart colleague
8. Between 500-800 words
9. Use emojis for visual breaks (3-5 total)
10. Include a "TL;DR" or key takeaway

OUTPUT FORMAT:
Respond with JUST the raw post text and hashtags at the bottom. Do NOT use JSON formatting, markdown code blocks, or any other wrapper. Just the raw text."""

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

    # Step 3: Format voice samples (removed)

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


async def stream_linkedin_content(request: GenerateRequest):
    settings = get_settings()

    article_data = {"title": "", "content": "", "word_count": 0}
    if request.trend.source_url:
        article_data = await scrape_article(request.trend.source_url)

    template = (
        STREAM_LINKEDIN_SHORT_PROMPT
        if request.content_type == "linkedin_short"
        else STREAM_LINKEDIN_LONG_PROMPT
    )

    prompt = ChatPromptTemplate.from_template(template)
    llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
        max_tokens=2000,
        streaming=True
    )

    chain = prompt | llm

    hook_text = request.hook_text if request.hook_text else "A strong attention grabbing hook."

    async for chunk in chain.astream(
        {
            "topic": request.trend.topic,
            "description": request.trend.description,
            "article_content": article_data.get("content", "No article content available."),
            "hook_text": hook_text,
        }
    ):
        if chunk.content:
            yield json.dumps({"chunk": chunk.content}) + "\n"

async def stream_ensemble_content(request: GenerateRequest):
    """
    Multi-model ensemble pipeline:
    1. Scrape source article
    2. Fire two async tasks to Groq models (Llama 3 8B and Llama 3 70B) for distinct drafts.
    3. Pass both drafts to an Editor model (OpenAI gpt-4o-mini) to synthesize the final post.
    4. Stream the Editor's response.
    """
    settings = get_settings()
    
    yield json.dumps({"chunk": "🧠 Initializing Ensemble Brainstorming...\n\n"}) + "\n"
    
    article_data = {"title": "", "content": "", "word_count": 0}
    if request.trend.source_url:
        yield json.dumps({"chunk": "📄 Reading source article...\n"}) + "\n"
        article_data = await scrape_article(request.trend.source_url)

    yield json.dumps({"chunk": "🤖 Firing up Groq models for concurrent drafting...\n"}) + "\n"

    # Define Groq Prompts
    MODEL_A_PROMPT = """You are an emotional storyteller. Write a very engaging, story-driven draft about the following topic.
TOPIC: {topic}
DESCRIPTION: {description}
ARTICLE SUMMARY: {article_content}
HOOK: {hook_text}

Focus on human emotion, personal experience, and storytelling. Keep it under 300 words."""

    MODEL_B_PROMPT = """You are a data-driven analytical expert. Write a highly logical, structured draft about the following topic.
TOPIC: {topic}
DESCRIPTION: {description}
ARTICLE SUMMARY: {article_content}
HOOK: {hook_text}

Focus on facts, structured arguments, and logical flow. Keep it under 300 words."""

    # We will use Llama 3.1 8B for A, and Llama 3.3 70B for B
    llm_a = ChatGroq(model="llama-3.1-8b-instant", api_key=settings.GROQ_API_KEY_1 or "dummy", temperature=0.9)
    llm_b = ChatGroq(model="llama3-70b-8192", api_key=settings.GROQ_API_KEY_2 or settings.GROQ_API_KEY_1 or "dummy", temperature=0.2)
    
    prompt_a = ChatPromptTemplate.from_template(MODEL_A_PROMPT)
    prompt_b = ChatPromptTemplate.from_template(MODEL_B_PROMPT)
    
    chain_a = prompt_a | llm_a
    chain_b = prompt_b | llm_b
    
    hook_text = request.hook_text if request.hook_text else "A strong attention grabbing hook."
    
    input_data = {
        "topic": request.trend.topic,
        "description": request.trend.description,
        "article_content": article_data.get("content", "No article content available."),
        "hook_text": hook_text,
    }
    
    # Run them concurrently
    try:
        results = await asyncio.gather(
            chain_a.ainvoke(input_data),
            chain_b.ainvoke(input_data),
            return_exceptions=True
        )
        
        draft_a = results[0].content if not isinstance(results[0], Exception) else "Failed to generate emotional draft."
        draft_b = results[1].content if not isinstance(results[1], Exception) else "Failed to generate analytical draft."
    except Exception as e:
        logger.error(f"Ensemble drafting failed: {e}")
        draft_a = "Draft A generation failed."
        draft_b = "Draft B generation failed."

    yield json.dumps({"chunk": "✨ Drafts received! Synthesizing final premium post...\n\n---\n\n"}) + "\n"

    # Final Editor Phase
    EDITOR_PROMPT = """You are a world-class LinkedIn Editor. You have received two distinct drafts from your team.
Draft 1 (Emotional):
{draft_a}

Draft 2 (Analytical):
{draft_b}

REQUIREMENTS:
1. Synthesize these into ONE brilliant, highly engaging LinkedIn post.
2. Blend the emotional storytelling of Draft 1 with the structured logic of Draft 2.
3. Start the post EXACTLY with this hook: {hook_text}
4. Format it beautifully with short paragraphs and a clear call to action.
5. Provide 3-5 hashtags at the bottom.
6. The output should be just the post text itself. Do not include markdown JSON blocks, just the raw text."""

    editor_prompt = ChatPromptTemplate.from_template(EDITOR_PROMPT)
    editor_llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.6,
        streaming=True
    )
    
    editor_chain = editor_prompt | editor_llm
    
    async for chunk in editor_chain.astream({
        "draft_a": draft_a,
        "draft_b": draft_b,
        "hook_text": hook_text
    }):
        if chunk.content:
            yield json.dumps({"chunk": chunk.content}) + "\n"



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


async def _evaluate_trend_with_search(topic: str, llm) -> tuple[int, int]:
    """Uses DDGS to find recent news on the topic and uses LLM to score its trendiness."""
    try:
        def fetch_news():
            with DDGS() as ddgs:
                return list(ddgs.news(topic, max_results=5, safesearch='off'))
        
        loop = asyncio.get_event_loop()
        news_results = await loop.run_in_executor(None, fetch_news)
        
        if not news_results:
            return 30, 40 # Low score if no recent news
            
        news_text = "\n".join([f"- {n.get('title', '')}: {n.get('body', '')}" for n in news_results])
        
        prompt = ChatPromptTemplate.from_template(
            "You are a trend analyzer. Based on the following recent news snippets about the topic '{topic}', evaluate how strongly it is trending.\n"
            "Return a JSON object with 'trend_score' (0-100) and 'confidence_score' (0-100).\n"
            "If the news is highly relevant, breaking, and shows a surge of interest, give a high trend_score (>80).\n"
            "News:\n{news_text}\n"
            "Output JSON format: {{\"trend_score\": 85, \"confidence_score\": 90}}"
        )
        chain = prompt | llm
        res = await chain.ainvoke({"topic": topic, "news_text": news_text})
        parsed = _parse_json_response(res.content)
        return parsed.get("trend_score", 50), parsed.get("confidence_score", 50)
    except Exception as e:
        logger.error(f"Error evaluating trend with search: {e}")
        return 50, 50


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
    
    # Using LLM's own score from the raw_texts analysis
    for topic_dict in topics:
        if "score" not in topic_dict:
            topic_dict["score"] = 75
        if "confidence_score" not in topic_dict:
            topic_dict["confidence_score"] = 85

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
    
    angle = request.angle if request.angle else "General insightful observation."
    
    logger.info(f"Generating hooks for topic: {request.trend.topic}")
    
    result = await chain.ainvoke({
        "topic": request.trend.topic,
        "description": request.trend.description,
        "angle": angle,
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

LISTENING_QUERIES_PROMPT = """You are a master of web search and data aggregation.
Your goal is to generate 3 to 5 highly optimized search queries to discover the latest, most viral, and most valuable live news, articles, and discussions for a specific creator.

NICHE / INDUSTRY: {niche}
TARGET AUDIENCE: {audience}

REQUIREMENTS:
1. Generate search queries that will return recent news, trends, or community discussions (e.g., from Reddit, major publications, or general web).
2. Use specific keywords related to the niche.
3. Be diverse (e.g., one query for news, one for specific subreddits using "site:reddit.com/r/...", one for general trends).

OUTPUT FORMAT (respond in valid JSON only, no markdown):
{{"queries": ["query 1", "query 2", "query 3"]}}"""

async def generate_listening_queries(request: GenerateListeningQueriesRequest) -> GenerateListeningQueriesResponse:
    """Generates optimal search queries for a given niche to be used by a live search API (e.g., Tavily)."""
    settings = get_settings()
    start_time = time.time()
    
    prompt = ChatPromptTemplate.from_template(LISTENING_QUERIES_PROMPT)
    llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
    )
    chain = prompt | llm
    
    logger.info(f"Generating listening queries for niche: {request.niche}")
    
    result = await chain.ainvoke({
        "niche": request.niche,
        "audience": request.audience,
    })
    
    parsed = _parse_json_response(result.content)
    queries = parsed.get("queries", [])
    
    if not queries:
        queries = [f"{request.niche} latest news", f"{request.niche} trends"]
        
    processing_time = int((time.time() - start_time) * 1000)
    tokens = result.response_metadata.get("token_usage", {}).get("total_tokens", 0) if hasattr(result, "response_metadata") else 0
    
    return GenerateListeningQueriesResponse(
        queries=queries,
        tokens_consumed=tokens,
        processing_time_ms=processing_time,
    )
