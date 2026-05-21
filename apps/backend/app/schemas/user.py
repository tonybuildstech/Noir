"""
Profile-related schemas (non-auth).

Auth/session shapes live in app/schemas/auth.py.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    """Fields a user can change on their own profile."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    city: Optional[str] = Field(None, max_length=100)


class ProfileOut(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    onboarding_completed: bool = False
    organization_name: Optional[str] = None
    tax_id: Optional[str] = None
    role_request: List[str] = []
    verification_status: str = "none"
    app_metadata: dict = {}
    user_metadata: dict = {}
    claimed_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileList(BaseModel):
    items: List[ProfileOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class OnboardingRequest(BaseModel):
    """Payload posted by the onboarding wizard after registration."""
    city: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    interest_tags: List[str] = Field(default_factory=list)
    role_request: List[str] = Field(default_factory=list)
    organization_name: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=100)
    organization_contact: Optional[str] = Field(None, max_length=255) # Email or Phone
    
    # Optional first venue
    venue_name: Optional[str] = Field(None, max_length=255)
    venue_address: Optional[str] = Field(None, max_length=255)
    venue_type: Optional[str] = Field(None)
