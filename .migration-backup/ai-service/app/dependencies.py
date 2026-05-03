from fastapi import Header, HTTPException, status
from app.config import get_settings


async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """
    Dependency that verifies the shared API key from the backend.
    Only the backend should call this service — reject everything else.
    """
    settings = get_settings()
    if x_api_key != settings.AI_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )
    return x_api_key
