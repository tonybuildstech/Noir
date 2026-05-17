from __future__ import annotations
from supabase import AsyncClient, acreate_client
from app.core.config import settings

_client: AsyncClient | None = None


async def get_supabase_admin() -> AsyncClient:
    global _client
    if _client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY moraju biti postavljeni."
            )
        _client = await acreate_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _client
