import asyncpg
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

class DatabaseSettings:
    pool: asyncpg.Pool = None

db_status = DatabaseSettings()

async def get_db_pool() -> asyncpg.Pool:
    if db_status.pool is None:
        settings = get_settings()
        logger.info(f"Connecting to Postgres using direct connection pools.")
        db_status.pool = await asyncpg.create_pool(settings.DATABASE_URL)
    return db_status.pool

async def close_db_pool():
    if db_status.pool:
        await db_status.pool.close()
        logger.info("Database connection closed")
