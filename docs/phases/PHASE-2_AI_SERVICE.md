# Phase 2 — AI Microservice Foundation

> **Timeline:** Week 1–2 (Days 4–8)  
> **Depends On:** Phase 1 (Backend must be running for integration test)  
> **Unlocks:** Phase 4 (Publish Now — needs generated content)  
> **Status:** 🔲 Not Started

---

## 🎯 Phase Objective

Build the Python FastAPI AI microservice that:
- Accepts trend data + voice samples from the backend
- Scrapes and cleans source articles (BeautifulSoup)
- Generates LinkedIn-optimized content (LangChain + OpenAI)
- Returns structured JSON (content, hook, hashtags, predictions)
- Authenticates requests via shared API key
- Exposes a health check endpoint

**End state:** `POST http://localhost:8000/generate` accepts trend data and returns a fully formed LinkedIn draft.

---

## 📁 Files to Create

```
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry + health + CORS
│   ├── config.py                  # Settings from env (Pydantic BaseSettings)
│   ├── dependencies.py            # API key auth dependency
│   ├── routes/
│   │   ├── __init__.py
│   │   └── generate.py            # POST /generate
│   ├── services/
│   │   ├── __init__.py
│   │   ├── article_scraper.py     # BeautifulSoup article cleaner
│   │   └── generator.py           # LangChain content generator
│   └── models/
│       ├── __init__.py
│       └── schemas.py             # Pydantic request/response models
│
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

---

## 📋 Task Breakdown

### Task 2.1 — Initialize Python Project
**Priority:** 🔴 Critical  
**Estimated Time:** 20 min

**Steps:**
1. Create `ai-service/` directory at project root
2. Create virtual environment:
   ```bash
   cd ai-service
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```
3. Create `requirements.txt`:
   ```
   fastapi==0.109.2
   uvicorn[standard]==0.27.1
   langchain==0.1.9
   langchain-openai==0.0.6
   openai==1.12.0
   beautifulsoup4==4.12.3
   lxml==5.1.0
   httpx==0.27.0
   pydantic==2.6.1
   pydantic-settings==2.1.0
   python-dotenv==1.0.1
   ```
4. Install: `pip install -r requirements.txt`

**Acceptance Criteria:**
- [ ] Virtual environment created
- [ ] All packages install without error
- [ ] `python -c "import fastapi; print(fastapi.__version__)"` works

---

### Task 2.2 — Configuration (`config.py`)
**Priority:** 🔴 Critical  
**Estimated Time:** 15 min

**Purpose:** Validate environment variables using Pydantic Settings. Fail fast if `OPENAI_API_KEY` is missing.

**Implementation Pattern:**
```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Required
    OPENAI_API_KEY: str
    AI_SERVICE_KEY: str  # Shared secret for backend auth

    # Optional with defaults
    OPENAI_MODEL: str = "gpt-4"
    MAX_ARTICLE_LENGTH: int = 5000
    PORT: int = 8000
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

**Acceptance Criteria:**
- [ ] Server refuses to start without `OPENAI_API_KEY`
- [ ] Server refuses to start without `AI_SERVICE_KEY`
- [ ] Settings are cached (singleton pattern)

---

### Task 2.3 — Pydantic Schemas (`models/schemas.py`)
**Priority:** 🔴 Critical  
**Estimated Time:** 20 min

**Purpose:** Define strict request/response contracts between backend and AI service.

**Implementation Pattern:**
```python
# app/models/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class ContentType(str, Enum):
    LINKEDIN_SHORT = "linkedin_short"
    LINKEDIN_LONG = "linkedin_long"


class TrendInput(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    source_url: Optional[str] = None
    keywords: list[str] = []


class GenerateRequest(BaseModel):
    trend: TrendInput
    voice_samples: list[str] = Field(default=[], max_length=10)
    content_type: ContentType = ContentType.LINKEDIN_SHORT
    platform: str = "linkedin"


class EngagementPrediction(BaseModel):
    estimated_likes: int = 0
    estimated_comments: int = 0
    estimated_shares: int = 0
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class GenerateResponse(BaseModel):
    content: str
    hook: str
    hashtags: list[str] = []
    engagement_prediction: EngagementPrediction
    model_version: str
    tokens_consumed: int = 0
    processing_time_ms: int = 0


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"
```

**Acceptance Criteria:**
- [ ] Request with missing `trend.topic` returns 422
- [ ] Response always includes all fields
- [ ] `content_type` validates against allowed enum values

---

### Task 2.4 — API Key Auth Dependency (`dependencies.py`)
**Priority:** 🔴 Critical  
**Estimated Time:** 15 min

**Purpose:** Only the backend can call this service. Verify the shared API key on every request.

**Implementation Pattern:**
```python
# app/dependencies.py
from fastapi import Header, HTTPException, status
from app.config import get_settings


async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    settings = get_settings()
    if x_api_key != settings.AI_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return x_api_key
```

**Acceptance Criteria:**
- [ ] Request without `X-API-Key` header returns 422
- [ ] Request with wrong key returns 403
- [ ] Request with correct key proceeds

---

### Task 2.5 — Article Scraper (`services/article_scraper.py`)
**Priority:** 🔴 Critical  
**Estimated Time:** 45 min

**Purpose:** Given a URL, scrape the article content, clean HTML, extract key text for the LLM prompt.

**Implementation Pattern:**
```python
# app/services/article_scraper.py
import httpx
from bs4 import BeautifulSoup
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)


async def scrape_article(url: str) -> dict:
    """
    Scrape and clean an article from a URL.
    Returns: { title, content, word_count }
    """
    settings = get_settings()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers={
                "User-Agent": "CreatorPulse/1.0 (Content Research Bot)"
            })
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # Remove unwanted elements
        for tag in soup(["script", "style", "nav", "header", "footer",
                         "aside", "form", "iframe", "noscript"]):
            tag.decompose()

        # Extract title
        title = ""
        if soup.title:
            title = soup.title.string or ""
        elif soup.find("h1"):
            title = soup.find("h1").get_text(strip=True)

        # Extract main content (priority: article > main > body)
        content_tag = (
            soup.find("article") or
            soup.find("main") or
            soup.find("body")
        )

        if not content_tag:
            return {"title": title, "content": "", "word_count": 0}

        # Get clean text
        paragraphs = content_tag.find_all(["p", "h2", "h3", "li"])
        content = "\n\n".join(
            p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)
        )

        # Truncate if too long
        if len(content) > settings.MAX_ARTICLE_LENGTH:
            content = content[:settings.MAX_ARTICLE_LENGTH] + "..."

        return {
            "title": title.strip(),
            "content": content,
            "word_count": len(content.split()),
        }

    except httpx.HTTPError as e:
        logger.warning(f"Failed to scrape {url}: {e}")
        return {"title": "", "content": "", "word_count": 0}
    except Exception as e:
        logger.error(f"Scraper error for {url}: {e}")
        return {"title": "", "content": "", "word_count": 0}
```

**Acceptance Criteria:**
- [ ] Successfully scrapes a real article URL
- [ ] Removes script/style/nav tags
- [ ] Truncates at configurable max length
- [ ] Returns empty dict on failure (no crashes)
- [ ] 15-second timeout on HTTP requests

---

### Task 2.6 — Content Generator (`services/generator.py`)
**Priority:** 🔴 Critical  
**Estimated Time:** 60 min

**Purpose:** Core LLM pipeline — takes trend + article + voice samples → generates LinkedIn post.

**Implementation Pattern:**
```python
# app/services/generator.py
import time
import logging
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.config import get_settings
from app.models.schemas import (
    GenerateRequest, GenerateResponse, EngagementPrediction
)
from app.services.article_scraper import scrape_article

logger = logging.getLogger(__name__)

# LinkedIn-specific prompts
LINKEDIN_SHORT_PROMPT = """You are a LinkedIn content strategist. Generate a short LinkedIn post (under 300 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}

VOICE STYLE SAMPLES (match this tone):
{voice_samples}

REQUIREMENTS:
1. Start with a strong hook (first line must grab attention)
2. Use short paragraphs (1-2 sentences each)
3. Include a clear call-to-action at the end
4. Suggest 3-5 relevant hashtags
5. Write in first person, conversational tone
6. Make it thought-provoking, not promotional
7. Under 300 words total

OUTPUT FORMAT (respond in valid JSON only):
{{
  "content": "The full post text",
  "hook": "The first attention-grabbing line",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}}"""

LINKEDIN_LONG_PROMPT = """You are a LinkedIn thought leader. Generate a long-form LinkedIn post (500-800 words) based on the trending topic.

TRENDING TOPIC: {topic}
TOPIC DESCRIPTION: {description}
SOURCE ARTICLE SUMMARY: {article_content}

VOICE STYLE SAMPLES (match this tone):
{voice_samples}

REQUIREMENTS:
1. Start with a compelling hook
2. Structure with clear sections
3. Include personal insights or anecdotes
4. End with a discussion question
5. Suggest 5-7 relevant hashtags
6. Professional but approachable tone
7. Between 500-800 words

OUTPUT FORMAT (respond in valid JSON only):
{{
  "content": "The full post text",
  "hook": "The first attention-grabbing line",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}}"""


async def generate_linkedin_content(request: GenerateRequest) -> GenerateResponse:
    settings = get_settings()
    start_time = time.time()

    # Step 1: Scrape source article if URL provided
    article_data = {"title": "", "content": "", "word_count": 0}
    if request.trend.source_url:
        article_data = await scrape_article(request.trend.source_url)

    # Step 2: Select prompt template
    template = (
        LINKEDIN_SHORT_PROMPT
        if request.content_type == "linkedin_short"
        else LINKEDIN_LONG_PROMPT
    )

    # Step 3: Format voice samples
    voice_text = "\n---\n".join(request.voice_samples) if request.voice_samples else "No voice samples provided. Use a professional, authentic LinkedIn tone."

    # Step 4: Build and invoke LLM chain
    prompt = ChatPromptTemplate.from_template(template)
    llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
        max_tokens=2000,
    )

    chain = prompt | llm

    result = await chain.ainvoke({
        "topic": request.trend.topic,
        "description": request.trend.description,
        "article_content": article_data.get("content", "No article content available."),
        "voice_samples": voice_text,
    })

    # Step 5: Parse LLM response
    import json
    try:
        parsed = json.loads(result.content)
    except json.JSONDecodeError:
        # Fallback: use raw content
        parsed = {
            "content": result.content,
            "hook": result.content.split("\n")[0],
            "hashtags": [],
        }

    processing_time = int((time.time() - start_time) * 1000)
    tokens = result.response_metadata.get("token_usage", {})

    return GenerateResponse(
        content=parsed.get("content", ""),
        hook=parsed.get("hook", ""),
        hashtags=parsed.get("hashtags", []),
        engagement_prediction=EngagementPrediction(
            estimated_likes=30,
            estimated_comments=5,
            confidence=0.6,
        ),
        model_version=settings.OPENAI_MODEL,
        tokens_consumed=tokens.get("total_tokens", 0),
        processing_time_ms=processing_time,
    )
```

**Acceptance Criteria:**
- [ ] Generates valid LinkedIn short post from trend data
- [ ] Generates valid LinkedIn long post from trend data
- [ ] Works with and without source URL
- [ ] Works with and without voice samples
- [ ] Returns structured JSON response
- [ ] Handles LLM errors gracefully (no crashes)
- [ ] Reports processing time and token consumption

---

### Task 2.7 — Generate Route (`routes/generate.py`)
**Priority:** 🔴 Critical  
**Estimated Time:** 20 min

**Implementation Pattern:**
```python
# app/routes/generate.py
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import GenerateRequest, GenerateResponse
from app.services.generator import generate_linkedin_content
from app.dependencies import verify_api_key
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate_content(
    request: GenerateRequest,
    _api_key: str = Depends(verify_api_key),
):
    try:
        logger.info(f"Generating {request.content_type} for topic: {request.trend.topic}")
        result = await generate_linkedin_content(request)
        logger.info(f"Generated content: {len(result.content)} chars, {result.tokens_consumed} tokens")
        return result
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
```

---

### Task 2.8 — FastAPI App Entry (`main.py`)
**Priority:** 🔴 Critical  
**Estimated Time:** 20 min

**Implementation Pattern:**
```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from app.routes.generate import router as generate_router
from app.config import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CreatorPulse AI Service",
    description="AI content generation microservice for LinkedIn",
    version="1.0.0",
)

# CORS — only backend should call this, but allow for dev flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Routes
app.include_router(generate_router)


@app.get("/health")
async def health_check():
    settings = get_settings()
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "model": settings.OPENAI_MODEL,
    }


@app.on_event("startup")
async def startup():
    settings = get_settings()  # Validates env on startup
    logger.info(f"🧠 AI Service starting — model: {settings.OPENAI_MODEL}")


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
```

---

### Task 2.9 — Dockerfile
**Priority:** 🟡 Important  
**Estimated Time:** 15 min

**Create `ai-service/Dockerfile`:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for lxml
RUN apt-get update && apt-get install -y \
    gcc libxml2-dev libxslt-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Task 2.10 — Wire Backend → AI Service (`backend/src/services/ai.service.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Purpose:** Backend HTTP client that calls the AI microservice. This is the bridge between Phase 1 and Phase 2.

> ⚠️ This file lives in `backend/`, but is built during Phase 2 because it requires the AI service to exist.

**Implementation Pattern:**
```typescript
// backend/src/services/ai.service.ts
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface GenerateRequest {
  trend: {
    topic: string;
    description: string;
    source_url?: string;
    keywords?: string[];
  };
  voice_samples: string[];
  content_type: 'linkedin_short' | 'linkedin_long';
  platform: string;
}

interface GenerateResponse {
  content: string;
  hook: string;
  hashtags: string[];
  engagement_prediction: {
    estimated_likes: number;
    estimated_comments: number;
    estimated_shares: number;
    confidence: number;
  };
  model_version: string;
  tokens_consumed: number;
  processing_time_ms: number;
}

export const aiService = {
  async generateContent(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const response = await axios.post<GenerateResponse>(
        `${env.AI_SERVICE_URL}/generate`,
        request,
        {
          headers: { 'X-API-Key': env.AI_SERVICE_KEY },
          timeout: 60000, // 60s timeout — LLM calls can be slow
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('AI service call failed', {
        status: error.response?.status,
        message: error.message,
      });
      throw new Error(`AI service error: ${error.response?.data?.detail || error.message}`);
    }
  },
};
```

**Also update `backend/src/config/env.ts`** to add:
```typescript
AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
AI_SERVICE_KEY: z.string().min(8),
```

---

## ✅ Phase 2 Completion Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `cd ai-service && pip install -r requirements.txt` — no errors | 🔲 |
| 2 | `python -m app.main` — FastAPI starts on port 8000 | 🔲 |
| 3 | `GET http://localhost:8000/health` — returns 200 | 🔲 |
| 4 | `POST /generate` without API key — returns 422 | 🔲 |
| 5 | `POST /generate` with wrong API key — returns 403 | 🔲 |
| 6 | `POST /generate` with valid key + trend data — returns LinkedIn content | 🔲 |
| 7 | Generated content is valid LinkedIn format (hook, hashtags, body) | 🔲 |
| 8 | Article scraper handles invalid URLs gracefully | 🔲 |
| 9 | Backend `aiService.generateContent()` calls AI service successfully | 🔲 |
| 10 | FastAPI Swagger docs available at `/docs` | 🔲 |

---

## 📎 References

- **Architecture:** `docs/ARCHITECTURE.md` → Sections 4, 5, 7 (Flow 1)
- **API Contract:** `docs/ARCHITECTURE.md` → Section 11 (AI Service Endpoints)
- **Folder Structure:** `docs/ARCHITECTURE.md` → Section 6
