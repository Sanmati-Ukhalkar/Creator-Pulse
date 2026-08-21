from pydantic import BaseModel, Field
from typing import Literal, List

class ContentBrainOutput(BaseModel):
    angle: Literal["bold", "educational", "controversial", "storytelling"]
    tone: Literal["founder", "expert", "relatable", "provocateur"]
    target_audience: str
    format: str = "carousel"

class SlideIdea(BaseModel):
    slide_order: int
    slide_type: Literal["hook", "insight", "example", "stat", "comparison", "cta"]
    idea: str = Field(..., max_length=200)

class CarouselPlannerOutput(BaseModel):
    slides: List[SlideIdea] = Field(..., min_length=5, max_length=6)

class SlideEnhancerOutput(BaseModel):
    headline: str = Field(..., max_length=100)
    subtext: str = Field(None, max_length=200)
    visual_description: str = Field(..., max_length=150)
