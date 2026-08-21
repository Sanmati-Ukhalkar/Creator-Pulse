from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class ContentType(str, Enum):
    """Supported LinkedIn content formats."""
    LINKEDIN_SHORT = "linkedin_short"
    LINKEDIN_LONG = "linkedin_long"


class TrendInput(BaseModel):
    """Trend data from the backend."""
    topic: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    source_url: Optional[str] = None
    keywords: list[str] = []


class GenerateRequest(BaseModel):
    """Request body for content generation."""
    trend: TrendInput
    hook_text: Optional[str] = None
    content_type: ContentType = ContentType.LINKEDIN_SHORT
    platform: str = "linkedin"
    use_ensemble: bool = False


class AnalyzeTrendsRequest(BaseModel):
    """Request body for trend analysis."""
    raw_texts: list[str] = Field(..., min_length=1)


class TopicResult(BaseModel):
    """A topic identified by the AI."""
    topic: str
    description: str
    keywords: list[str] = []
    score: int
    confidence_score: int = 80


class AnalyzeTrendsResponse(BaseModel):
    """Response containing identified trends."""
    topics: list[TopicResult]
    tokens_consumed: int = 0
    processing_time_ms: int = 0


class GenerateHooksRequest(BaseModel):
    """Request body for hook generation."""
    trend: TrendInput
    angle: Optional[str] = None


class HookResult(BaseModel):
    """A generated hook and reasoning."""
    hook: str
    reasoning: str


class GenerateHooksResponse(BaseModel):
    """Response body containing generated hooks."""
    hooks: list[HookResult]
    tokens_consumed: int = 0
    processing_time_ms: int = 0


class EngagementPrediction(BaseModel):
    """Predicted engagement metrics for generated content."""
    estimated_likes: int = 0
    estimated_comments: int = 0
    estimated_shares: int = 0
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class GenerateResponse(BaseModel):
    """Response body containing generated LinkedIn content."""
    content: str
    hook: str
    hashtags: list[str] = []
    engagement_prediction: EngagementPrediction
    ai_model_version: str
    tokens_consumed: int = 0
    processing_time_ms: int = 0


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    version: str = "1.0.0"


class ImageGenerateRequest(BaseModel):
    """Request body for AI image generation."""
    post_text: str = Field(..., min_length=10, description="The generated post text to base the image on")
    topic: str = Field(..., min_length=1, max_length=300, description="The trend topic title")
    provider: Literal["pollinations", "gemini"] = "pollinations"
    seed: int = Field(default=42, description="Seed for Pollinations — change to regenerate a different variation")


class ImageGenerateResponse(BaseModel):
    """Response body containing generated image data."""
    image_b64: str = Field(..., description="Base64-encoded image bytes")
    format: str = Field(default="jpeg", description="Image format: jpeg or png")
    width: int = 1216
    height: int = 832
    provider: str
    prompt_used: str = Field(..., description="The exact prompt sent to the image model")
    processing_time_ms: int = 0


class GenerateListeningQueriesRequest(BaseModel):
    niche: str
    audience: str


class GenerateListeningQueriesResponse(BaseModel):
    queries: list[str]
    tokens_consumed: int = 0
    processing_time_ms: int = 0
