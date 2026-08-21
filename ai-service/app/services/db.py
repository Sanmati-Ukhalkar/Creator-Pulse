"""
Database helpers for the AI service.

On Windows, asyncpg connection pools can deadlock inside BullMQ's event loop
because BullMQ uses its own thread executor. We use per-query connections
(asyncpg.connect / asyncpg.Connection) to avoid this.
"""
import asyncpg
from app.config import get_settings
import logging
import ssl

logger = logging.getLogger(__name__)

# Build a reusable SSL context for Supabase (TLS required)
def _make_ssl() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

_SSL_CTX = _make_ssl()


def _clean_url(url: str) -> str:
    """Strip any ?sslmode=... from the URL — asyncpg uses the ssl= kwarg."""
    if "?" in url:
        url = url.split("?")[0]
    return url


async def get_connection() -> asyncpg.Connection:
    """Open a fresh asyncpg connection (no pool). Caller must close it."""
    settings = get_settings()
    url = _clean_url(settings.DATABASE_URL)
    if "localhost" in url or "127.0.0.1" in url:
        conn = await asyncpg.connect(url, timeout=30)
    else:
        conn = await asyncpg.connect(url, ssl=_SSL_CTX, timeout=30)
    return conn


# ─── Legacy pool shim (kept for backwards compatibility) ───────────────────────
class _FakePool:
    """
    Minimal context-manager shim so existing `async with pool.acquire() as conn`
    code continues to work without any changes to the worker files.
    """
    def acquire(self):
        return _ConnCtx()

    async def close(self):
        pass


class _ConnCtx:
    """Async context manager that opens/closes a real asyncpg connection."""

    def __init__(self):
        self._conn = None

    async def __aenter__(self) -> asyncpg.Connection:
        self._conn = await get_connection()
        return self._conn

    async def __aexit__(self, exc_type, exc, tb):
        if self._conn:
            await self._conn.close()
            self._conn = None


# Module-level singleton so existing `get_db_pool()` calls get the shim
_pool_instance = _FakePool()


async def get_db_pool():
    """
    Returns the fake-pool shim.
    Workers use `async with pool.acquire() as conn` — this satisfies that API
    while opening a fresh connection each time (avoids Windows pool deadlock).
    """
    return _pool_instance


async def close_db_pool():
    """No-op — connections are closed after each query block."""
    logger.info("close_db_pool called (no-op with per-query connections)")
