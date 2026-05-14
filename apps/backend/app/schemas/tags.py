"""Tag schemas — shared taxonomy for genres and event types."""
from __future__ import annotations

from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


TagCategory = Literal["genre", "event_type"]


class TagOut(BaseModel):
    id: UUID
    name: str
    slug: str
    category: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class TagListResponse(BaseModel):
    items: List[TagOut]
    total: int
