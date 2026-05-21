"""
Profile routes.

Read + self-edit profile data. Identity management (email/password) lives
in Supabase — we don't expose endpoints for it.
"""
from datetime import datetime, timezone
from math import ceil
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.profile import Profile, UserPreference
from app.models.tags import Tag
from app.schemas.user import OnboardingRequest, ProfileList, ProfileOut, ProfileUpdate
from app.services.rbac import require_platform_roles


router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = (
        await db.execute(select(Profile).where(Profile.id == user.id))
    ).scalars().first()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return ProfileOut.model_validate(profile)


@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(
    patch: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = (
        await db.execute(select(Profile).where(Profile.id == user.id))
    ).scalars().first()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")

    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return ProfileOut.model_validate(profile)


from sqlalchemy.orm import selectinload

from app.core.logger import get_logger
log = get_logger("jetapi.user")

from app.models.profile import Profile, UserPreference, OrganizationMember
from app.models.noir import Organization, Venue
import re

def slugify(text: str) -> str:
    """Simple slugify implementation."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

async def _get_unique_org_slug(db: AsyncSession, name: str) -> str:
    base_slug = slugify(name) or "org"
    slug = base_slug
    counter = 1
    while True:
        stmt = select(Organization).where(Organization.slug == slug)
        res = await db.execute(stmt)
        if not res.scalars().first():
            break
        counter += 1
        slug = f"{base_slug}-{counter}"
    return slug

@router.post("/me/onboarding", response_model=ProfileOut)
async def complete_onboarding(
    payload: OnboardingRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    One-shot onboarding finaliser. Writes `city`, `date_of_birth`,
    `onboarding_completed=true` to the profile, upserts the interest tags
    onto `user_preferences`, and returns the updated profile.

    If the user requested 'organizer' or 'venue_owner' roles, a pending
    Organization is created and linked to the user as owner.
    """
    log.info(f"Starting onboarding for user {user.id}")
    # Fetch profile with preferences in one go
    result = await db.execute(
        select(Profile)
        .where(Profile.id == user.id)
        .options(selectinload(Profile.preferences))
    )
    profile = result.scalars().first()
    
    if profile is None:
        log.warning(f"Profile not found for user {user.id}")
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")

    # Filter interest_tags against the taxonomy
    valid_slugs: List[str] = []
    if payload.interest_tags:
        log.info(f"Filtering {len(payload.interest_tags)} interest tags")
        rows = (
            await db.execute(
                select(Tag.slug).where(
                    Tag.slug.in_(payload.interest_tags),
                    Tag.is_active.is_(True),
                )
            )
        ).scalars().all()
        valid_slugs = list(rows)

    # Update profile fields
    profile.city = payload.city.strip()
    profile.date_of_birth = payload.date_of_birth
    profile.onboarding_completed = True
    
    # New role-based fields
    profile.role_request = payload.role_request
    profile.organization_name = payload.organization_name
    profile.tax_id = payload.tax_id
    
    if payload.role_request and any(r in ["organizer", "venue_owner"] for r in payload.role_request):
        profile.verification_status = "pending"
        
        # Create a pending organization for the user
        org_name = payload.organization_name or f"{profile.first_name}'s Org"
        org_slug = await _get_unique_org_slug(db, org_name)
        
        new_org = Organization(
            name=org_name,
            slug=org_slug,
            can_organize="organizer" in payload.role_request,
            can_own_venues="venue_owner" in payload.role_request,
            tax_id=payload.tax_id,
            contact_email=payload.organization_contact if "@" in (payload.organization_contact or "") else None,
            contact_phone=payload.organization_contact if "@" not in (payload.organization_contact or "") else None,
            city=payload.city.strip(),
            is_verified=False, # Must be approved by platform admin
            is_active=True
        )
        db.add(new_org)
        await db.flush() # Populate new_org.id
        
        # Link user as the owner
        member = OrganizationMember(
            org_id=new_org.id,
            user_id=user.id,
            role="owner",
            is_active=True,
            joined_at=datetime.now(timezone.utc)
        )
        db.add(member)

        # Optional: Create first venue
        if payload.venue_name and payload.venue_address and payload.venue_type:
            # Simple unique slug for venue
            venue_slug = slugify(payload.venue_name)
            v_stmt = select(Venue).where(Venue.slug == venue_slug)
            if (await db.execute(v_stmt)).scalars().first():
                venue_slug = f"{venue_slug}-{new_org.id.hex[:4]}"

            new_venue = Venue(
                org_id=new_org.id,
                name=payload.venue_name,
                slug=venue_slug,
                address=payload.venue_address,
                city=payload.city.strip(),
                venue_type=payload.venue_type,
                visibility="public",
                is_active=True
            )
            db.add(new_venue)
            log.info(f"Created first venue '{payload.venue_name}' for org {new_org.id}")

        log.info(f"Created pending organization '{org_name}' for user {user.id}")

    # Upsert user_preferences
    if profile.preferences:
        log.info(f"Updating preferences for user {user.id}")
        profile.preferences.interest_tags = valid_slugs
    else:
        log.info(f"Creating new preferences for user {user.id}")
        prefs = UserPreference(user_id=user.id, interest_tags=valid_slugs)
        db.add(prefs)

    log.info(f"Committing onboarding for user {user.id}")
    await db.commit()
    log.info(f"Refreshing profile for user {user.id}")
    await db.refresh(profile)
    log.info(f"Onboarding complete for user {user.id}")
    return ProfileOut.model_validate(profile)


@router.get("", response_model=ProfileList)
async def list_profiles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(require_platform_roles("super_admin", "support")),
):
    query = select(Profile)
    count_query = select(func.count(Profile.id))

    if search:
        term = f"%{search}%"
        flt = or_(
            Profile.first_name.ilike(term),
            Profile.last_name.ilike(term),
            Profile.city.ilike(term),
        )
        query = query.where(flt)
        count_query = count_query.where(flt)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    rows = (await db.execute(query.offset(offset).limit(page_size))).scalars().all()

    return ProfileList(
        items=[ProfileOut.model_validate(p) for p in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 1,
    )


@router.get("/{user_id}", response_model=ProfileOut)
async def get_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(require_platform_roles("super_admin", "support")),
):
    profile = (
        await db.execute(select(Profile).where(Profile.id == user_id))
    ).scalars().first()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return ProfileOut.model_validate(profile)
