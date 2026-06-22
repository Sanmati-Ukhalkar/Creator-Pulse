from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    """
    AI Service configuration.
    All values are loaded from environment variables or .env file.
    """

    # Required — server won't start without these
    OPENAI_API_KEY: str
    AI_SERVICE_KEY: str  # Shared secret for backend authentication

    # Local Database Configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/creator_pulse"
    REDIS_URL: str = "redis://localhost:6379"

    # Optional with defaults
    OPENAI_MODEL: str = "gpt-4o-mini"
    MAX_ARTICLE_LENGTH: int = 5000
    PORT: int = 8000
    DEBUG: bool = False

    class Config:
        env_file = str(Path(__file__).parent.parent / ".env")
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings singleton.
    Call get_settings() anywhere to access config without re-reading env.
    """
    return Settings()
