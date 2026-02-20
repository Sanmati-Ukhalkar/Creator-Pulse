from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    AI Service configuration.
    All values are loaded from environment variables or .env file.
    """

    # Required — server won't start without these
    OPENAI_API_KEY: str
    AI_SERVICE_KEY: str  # Shared secret for backend authentication

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
    """
    Cached settings singleton.
    Call get_settings() anywhere to access config without re-reading env.
    """
    return Settings()
