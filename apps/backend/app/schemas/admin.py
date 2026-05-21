"""Schemas for the platform super-admin dashboard.

These power the global admin UI — list/detail views and oversight actions
that span all organizations. Authority is checked at the route layer
(`require_platform_roles`).
"""
from datetime import datetime
from decimal import Decimal
from typing import Generic, List, Literal, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# --------------------------------------------------------------------------
# Overview metrics
# --------------------------------------------------------------------------
class AdminMetrics(BaseModel):
    users: int
    super_admins: int
    organizations: int
    organizations_unverified: int
    venues: int
    events: int
    events_published: int
    occurrences: int


# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------
class AdminMembershipOut(BaseModel):
    org_id: UUID
    org_name: Optional[str] = None
    role: str
    is_active: bool


class AdminUserOut(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_completed: bool = False
    platform_role: str = "user"
    is_ghost: bool = False
    organization_name: Optional[str] = None
    tax_id: Optional[str] = None
    role_request: List[str] = []
    verification_status: str = "none"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserDetail(AdminUserOut):
    memberships: List[AdminMembershipOut] = []
    last_login: Optional[datetime] = None


class UpdateUserRole(BaseModel):
    platform_role: str  # super_admin | support | finance_admin | user


# --------------------------------------------------------------------------
# Organizations
# --------------------------------------------------------------------------
class AdminOrganizationOut(BaseModel):
    id: UUID
    name: str
    slug: str
    city: Optional[str] = None
    contact_email: Optional[str] = None
    can_organize: bool
    can_own_venues: bool
    is_verified: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminOrgMemberOut(BaseModel):
    user_id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: str
    is_active: bool


class AdminVenueOut(BaseModel):
    id: UUID
    org_id: UUID
    org_name: Optional[str] = None
    name: str
    slug: str
    city: str
    venue_type: str
    visibility: str
    total_capacity: Optional[int] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class AdminOrganizationDetail(AdminOrganizationOut):
    description: Optional[str] = None
    website: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    members: List[AdminOrgMemberOut] = []
    venues: List[AdminVenueOut] = []


class UpdateOrganization(BaseModel):
    """Platform-admin overrides for an organization."""
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    can_organize: Optional[bool] = None
    can_own_venues: Optional[bool] = None


# --------------------------------------------------------------------------
# Events
# --------------------------------------------------------------------------
class AdminEventOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: str
    is_free: bool
    organizer_org_id: UUID
    organizer_org_name: Optional[str] = None
    occurrence_count: int = 0
    event_date: Optional[datetime] = None
    location_name: Optional[str] = None
    ticket_price: Optional[Decimal] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUpdateEvent(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: Optional[Literal[
        "draft", "pending_venue", "venue_confirmed",
        "published", "cancelled", "completed"
    ]] = None
    is_free: Optional[bool] = None
    event_date: Optional[datetime] = None
    location_name: Optional[str] = None
    ticket_price: Optional[Decimal] = None


class AdminEventCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_free: bool = False
    status: Literal[
        "draft", "pending_venue", "venue_confirmed",
        "published", "cancelled", "completed"
    ] = "draft"
    organizer_org_id: UUID
    event_date: Optional[datetime] = None
    location_name: Optional[str] = None
    ticket_price: Optional[Decimal] = None


class AdminUpdateUser(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
