"""
Tags routes.

Public read-only endpoint exposing the shared taxonomy (music genres,
event types). Consumed by the onboarding wizard and event/venue filters.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tags import Tag
from app.schemas.tags import TagCategory, TagListResponse, TagOut


router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("", response_model=TagListResponse)
async def list_tags(
    category: Optional[TagCategory] = Query(None, description="Filter by tag category"),
    active_only: bool = Query(True, description="Return only active tags"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Tag)
    if category is not None:
        query = query.where(Tag.category == category)
    if active_only:
        query = query.where(Tag.is_active.is_(True))
    query = query.order_by(Tag.category, Tag.name)

    rows = (await db.execute(query)).scalars().all()
    items = [TagOut.model_validate(t) for t in rows]
    return TagListResponse(items=items, total=len(items))
