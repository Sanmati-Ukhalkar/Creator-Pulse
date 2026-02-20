from pydantic import BaseModel, Field
from typing import Optional
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
    voice_samples: list[str] = Field(default=[], max_length=10)
    content_type: ContentType = ContentType.LINKEDIN_SHORT
    platform: str = "linkedin"


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
