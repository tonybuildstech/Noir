"""Service layer for the platform super-admin dashboard.

Read-mostly oversight queries that span every organization. Authority is
enforced at the route layer — these functions assume the caller is already
a platform admin.
"""
from datetime import datetime
from decimal import Decimal
from math import ceil
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete as sql_delete, func, or_, select
from sqlalchemy.orm import selectinload

from app.core.supabase_admin import get_supabase_admin
from app.models.audit import AuditLog
from app.models.noir import Event, EventOccurrence, EventTier, OccurrencePackage, Organization, Ticket, Venue
from app.models.profile import OrganizationMember, Profile, UserPlatformRole
from app.schemas.admin import (
    AdminEventCreate,
    AdminEventOut,
    AdminMembershipOut,
    AdminMetrics,
    AdminOrganizationDetail,
    AdminOrganizationOut,
    AdminOrgMemberOut,
    AdminUpdateEvent,
    AdminUpdateUser,
    AdminUserDetail,
    AdminUserOut,
    AdminVenueOut,
    Page,
    UpdateOrganization,
    UpdateUserRole,
)

PLATFORM_ROLES = {"super_admin", "support", "finance_admin", "user"}


def _json_safe(d: dict) -> dict:
    """Convert datetime/Decimal to JSON-serializable types for AuditLog."""
    result = {}
    for k, v in d.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, Decimal):
            result[k] = float(v)
        elif isinstance(v, UUID):
            result[k] = str(v)
        else:
            result[k] = v
    return result


async def _unique_slug(db, base: str) -> str:
    """Dodaje -2, -3... dok slug nije jedinstven. Maks 100 varijanti."""
    slug, i = base, 2
    while (await db.execute(select(Event.id).where(Event.slug == slug))).scalar():
        if i > 100:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Ne mogu generirati jedinstven slug za '{base}'. Pokušaj drugi naziv.",
            )
        slug = f"{base}-{i}"
        i += 1
    return slug


class AdminService:
    # ---------------------------------------------------------------- metrics
    @staticmethod
    async def metrics(db) -> AdminMetrics:
        async def _count(stmt) -> int:
            return (await db.execute(stmt)).scalar() or 0

        return AdminMetrics(
            users=await _count(select(func.count(Profile.id))),
            super_admins=await _count(
                select(func.count(UserPlatformRole.user_id)).where(
                    UserPlatformRole.role == "super_admin"
                )
            ),
            organizations=await _count(select(func.count(Organization.id))),
            organizations_unverified=await _count(
                select(func.count(Organization.id)).where(
                    Organization.is_verified.is_(False)
                )
            ),
            venues=await _count(select(func.count(Venue.id))),
            events=await _count(select(func.count(Event.id))),
            events_published=await _count(
                select(func.count(Event.id)).where(Event.status == "published")
            ),
            occurrences=await _count(select(func.count(EventOccurrence.id))),
        )

    # ------------------------------------------------------------------ users
    @staticmethod
    async def list_users(
        db,
        page: int,
        page_size: int,
        search: Optional[str],
        role: Optional[str],
    ) -> Page[AdminUserOut]:
        base = select(Profile, UserPlatformRole.role).join(
            UserPlatformRole,
            UserPlatformRole.user_id == Profile.id,
            isouter=True,
        )
        count_stmt = select(func.count(Profile.id))

        if search:
            term = f"%{search}%"
            flt = or_(
                Profile.first_name.ilike(term),
                Profile.last_name.ilike(term),
                Profile.email.ilike(term),
                Profile.city.ilike(term),
            )
            base = base.where(flt)
            count_stmt = count_stmt.where(flt)

        if role:
            base = base.where(UserPlatformRole.role == role)
            count_stmt = (
                count_stmt.select_from(Profile)
                .join(UserPlatformRole, UserPlatformRole.user_id == Profile.id)
                .where(UserPlatformRole.role == role)
            )

        total = (await db.execute(count_stmt)).scalar() or 0
        offset = (page - 1) * page_size
        rows = (
            await db.execute(
                base.order_by(Profile.created_at.desc())
                .offset(offset)
                .limit(page_size)
            )
        ).all()

        items = [
            AdminUserOut(
                id=p.id,
                first_name=p.first_name,
                last_name=p.last_name,
                email=p.email,
                city=p.city,
                phone=p.phone,
                avatar_url=p.avatar_url,
                onboarding_completed=p.onboarding_completed,
                platform_role=role_value or "user",
                is_ghost=p.claimed_at is None,
                organization_name=p.organization_name,
                tax_id=p.tax_id,
                role_request=p.role_request,
                verification_status=p.verification_status,
                created_at=p.created_at,
            )
            for p, role_value in rows
        ]
        return Page[AdminUserOut](
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=ceil(total / page_size) if total else 1,
        )

    @staticmethod
    async def get_user(db, user_id: UUID) -> AdminUserDetail:
        profile = (
            await db.execute(select(Profile).where(Profile.id == user_id))
        ).scalars().first()
        if profile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Korisnik nije pronađen")

        role_value = (
            await db.execute(
                select(UserPlatformRole.role).where(
                    UserPlatformRole.user_id == user_id
                )
            )
        ).scalar()

        member_rows = (
            await db.execute(
                select(OrganizationMember, Organization.name)
                .join(Organization, Organization.id == OrganizationMember.org_id)
                .where(OrganizationMember.user_id == user_id)
            )
        ).all()

        return AdminUserDetail(
            id=profile.id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            email=profile.email,
            city=profile.city,
            phone=profile.phone,
            avatar_url=profile.avatar_url,
            onboarding_completed=profile.onboarding_completed,
            platform_role=role_value or "user",
            is_ghost=profile.claimed_at is None,
            organization_name=profile.organization_name,
            tax_id=profile.tax_id,
            role_request=profile.role_request,
            verification_status=profile.verification_status,
            created_at=profile.created_at,
            last_login=profile.last_login,
            memberships=[
                AdminMembershipOut(
                    org_id=m.org_id,
                    org_name=org_name,
                    role=m.role,
                    is_active=m.is_active,
                )
                for m, org_name in member_rows
            ],
        )

    @staticmethod
    async def update_user_role(
        db, user_id: UUID, payload: UpdateUserRole, granted_by: UUID
    ) -> AdminUserDetail:
        if payload.platform_role not in PLATFORM_ROLES:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Nepoznata uloga: {payload.platform_role}",
            )

        profile = (
            await db.execute(select(Profile).where(Profile.id == user_id))
        ).scalars().first()
        if profile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Korisnik nije pronađen")

        existing = (
            await db.execute(
                select(UserPlatformRole).where(
                    UserPlatformRole.user_id == user_id
                )
            )
        ).scalars().first()

        if existing is None:
            db.add(
                UserPlatformRole(
                    user_id=user_id,
                    role=payload.platform_role,
                    granted_by=granted_by,
                )
            )
        else:
            existing.role = payload.platform_role
            existing.granted_by = granted_by

        await db.commit()
        return await AdminService.get_user(db, user_id)

    # ---------------------------------------------------------- organizations
    @staticmethod
    async def list_organizations(
        db,
        page: int,
        page_size: int,
        search: Optional[str],
        verified: Optional[bool],
    ) -> Page[AdminOrganizationOut]:
        base = select(Organization)
        count_stmt = select(func.count(Organization.id))

        if search:
            term = f"%{search}%"
            flt = or_(
                Organization.name.ilike(term),
                Organization.slug.ilike(term),
                Organization.city.ilike(term),
            )
            base = base.where(flt)
            count_stmt = count_stmt.where(flt)

        if verified is not None:
            base = base.where(Organization.is_verified.is_(verified))
            count_stmt = count_stmt.where(Organization.is_verified.is_(verified))

        total = (await db.execute(count_stmt)).scalar() or 0
        offset = (page - 1) * page_size
        rows = (
            await db.execute(
                base.order_by(Organization.created_at.desc())
                .offset(offset)
                .limit(page_size)
            )
        ).scalars().all()

        return Page[AdminOrganizationOut](
            items=[AdminOrganizationOut.model_validate(o) for o in rows],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=ceil(total / page_size) if total else 1,
        )

    @staticmethod
    async def get_organization(db, org_id: UUID) -> AdminOrganizationDetail:
        org = (
            await db.execute(
                select(Organization)
                .where(Organization.id == org_id)
                .options(selectinload(Organization.venues))
            )
        ).scalars().first()
        if org is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Organizacija nije pronađena"
            )

        member_rows = (
            await db.execute(
                select(OrganizationMember, Profile)
                .join(Profile, Profile.id == OrganizationMember.user_id)
                .where(OrganizationMember.org_id == org_id)
            )
        ).all()

        return AdminOrganizationDetail(
            id=org.id,
            name=org.name,
            slug=org.slug,
            city=org.city,
            contact_email=org.contact_email,
            contact_phone=org.contact_phone,
            website=org.website,
            address=org.address,
            description=org.description,
            can_organize=org.can_organize,
            can_own_venues=org.can_own_venues,
            is_verified=org.is_verified,
            is_active=org.is_active,
            created_at=org.created_at,
            members=[
                AdminOrgMemberOut(
                    user_id=m.user_id,
                    full_name=" ".join(
                        filter(None, [p.first_name, p.last_name])
                    ) or None,
                    email=p.email,
                    role=m.role,
                    is_active=m.is_active,
                )
                for m, p in member_rows
            ],
            venues=[
                AdminVenueOut(
                    id=v.id,
                    org_id=v.org_id,
                    org_name=org.name,
                    name=v.name,
                    slug=v.slug,
                    city=v.city,
                    venue_type=v.venue_type,
                    visibility=v.visibility,
                    total_capacity=v.total_capacity,
                    is_active=v.is_active,
                )
                for v in org.venues
            ],
        )

    @staticmethod
    async def update_organization(
        db, org_id: UUID, payload: UpdateOrganization
    ) -> AdminOrganizationDetail:
        org = (
            await db.execute(
                select(Organization).where(Organization.id == org_id)
            )
        ).scalars().first()
        if org is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Organizacija nije pronađena"
            )

        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(org, field, value)

        # The DB enforces chk_org_has_capability — guard before the round-trip.
        if not (org.can_organize or org.can_own_venues):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Organizacija mora imati barem jednu sposobnost "
                "(organiziranje ili posjedovanje prostora).",
            )

        await db.commit()
        return await AdminService.get_organization(db, org_id)

    # ----------------------------------------------------------------- venues
    @staticmethod
    async def list_venues(
        db,
        page: int,
        page_size: int,
        search: Optional[str],
        org_id: Optional[UUID],
    ) -> Page[AdminVenueOut]:
        base = select(Venue, Organization.name).join(
            Organization, Organization.id == Venue.org_id
        )
        count_stmt = select(func.count(Venue.id))

        if search:
            term = f"%{search}%"
            flt = or_(Venue.name.ilike(term), Venue.city.ilike(term))
            base = base.where(flt)
            count_stmt = count_stmt.where(flt)

        if org_id:
            base = base.where(Venue.org_id == org_id)
            count_stmt = count_stmt.where(Venue.org_id == org_id)

        total = (await db.execute(count_stmt)).scalar() or 0
        offset = (page - 1) * page_size
        rows = (
            await db.execute(
                base.order_by(Venue.name).offset(offset).limit(page_size)
            )
        ).all()

        return Page[AdminVenueOut](
            items=[
                AdminVenueOut(
                    id=v.id,
                    org_id=v.org_id,
                    org_name=org_name,
                    name=v.name,
                    slug=v.slug,
                    city=v.city,
                    venue_type=v.venue_type,
                    visibility=v.visibility,
                    total_capacity=v.total_capacity,
                    is_active=v.is_active,
                )
                for v, org_name in rows
            ],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=ceil(total / page_size) if total else 1,
        )

    # ----------------------------------------------------------------- events
    @staticmethod
    async def list_events(
        db,
        page: int,
        page_size: int,
        search: Optional[str],
        status_filter: Optional[str],
    ) -> Page[AdminEventOut]:
        occ_count = (
            select(
                EventOccurrence.event_id,
                func.count(EventOccurrence.id).label("occ_count"),
            )
            .group_by(EventOccurrence.event_id)
            .subquery()
        )
        base = (
            select(
                Event,
                Organization.name,
                func.coalesce(occ_count.c.occ_count, 0),
            )
            .join(Organization, Organization.id == Event.organizer_org_id)
            .join(occ_count, occ_count.c.event_id == Event.id, isouter=True)
        )
        count_stmt = select(func.count(Event.id))

        if search:
            term = f"%{search}%"
            base = base.where(Event.name.ilike(term))
            count_stmt = count_stmt.where(Event.name.ilike(term))

        if status_filter:
            base = base.where(Event.status == status_filter)
            count_stmt = count_stmt.where(Event.status == status_filter)

        total = (await db.execute(count_stmt)).scalar() or 0
        offset = (page - 1) * page_size
        rows = (
            await db.execute(
                base.order_by(Event.created_at.desc())
                .offset(offset)
                .limit(page_size)
            )
        ).all()

        return Page[AdminEventOut](
            items=[
                AdminEventOut(
                    id=e.id,
                    name=e.name,
                    slug=e.slug,
                    description=e.description,
                    cover_image_url=e.cover_image_url,
                    status=e.status,
                    is_free=e.is_free,
                    organizer_org_id=e.organizer_org_id,
                    organizer_org_name=org_name,
                    occurrence_count=occ,
                    event_date=e.event_date,
                    location_name=e.location_name,
                    ticket_price=e.ticket_price,
                    created_at=e.created_at,
                )
                for e, org_name, occ in rows
            ],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=ceil(total / page_size) if total else 1,
        )

    @staticmethod
    async def delete_event(db, event_id: UUID, actor_id: UUID) -> None:
        event = (
            await db.execute(select(Event).where(Event.id == event_id))
        ).scalars().first()
        if event is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Event nije pronađen")

        occ_ids_stmt = select(EventOccurrence.id).where(EventOccurrence.event_id == event_id)
        await db.execute(sql_delete(Ticket).where(Ticket.occurrence_id.in_(occ_ids_stmt)))
        await db.execute(sql_delete(OccurrencePackage).where(OccurrencePackage.occurrence_id.in_(occ_ids_stmt)))
        await db.execute(sql_delete(EventTier).where(EventTier.occurrence_id.in_(occ_ids_stmt)))
        await db.execute(sql_delete(EventOccurrence).where(EventOccurrence.event_id == event_id))

        db.add(AuditLog(
            actor_id=actor_id,
            action="delete_event",
            resource_type="event",
            resource_id=str(event_id),
            old_value={"name": event.name, "slug": event.slug, "status": event.status},
        ))
        await db.delete(event)
        await db.commit()

    @staticmethod
    async def update_event(
        db, event_id: UUID, payload: AdminUpdateEvent, actor_id: UUID
    ) -> AdminEventOut:
        event = (
            await db.execute(select(Event).where(Event.id == event_id))
        ).scalars().first()
        if event is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Event nije pronađen")

        old_value = _json_safe({f: getattr(event, f) for f in payload.model_fields})

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(event, field, value)

        db.add(AuditLog(
            actor_id=actor_id,
            action="update_event",
            resource_type="event",
            resource_id=str(event_id),
            old_value=old_value,
            new_value=_json_safe(payload.model_dump(exclude_unset=True)),
        ))
        await db.commit()
        await db.refresh(event)

        occ_subquery = (
            select(func.count(EventOccurrence.id))
            .where(EventOccurrence.event_id == event_id)
            .scalar_subquery()
        )
        row = (
            await db.execute(
                select(Organization.name, occ_subquery.label("occ_count"))
                .where(Organization.id == event.organizer_org_id)
            )
        ).first()
        org_name = row.name if row else None
        occ_count = row.occ_count if row else 0

        return AdminEventOut(
            id=event.id,
            name=event.name,
            slug=event.slug,
            description=event.description,
            cover_image_url=event.cover_image_url,
            status=event.status,
            is_free=event.is_free,
            organizer_org_id=event.organizer_org_id,
            organizer_org_name=org_name,
            occurrence_count=occ_count,
            event_date=event.event_date,
            location_name=event.location_name,
            ticket_price=event.ticket_price,
            created_at=event.created_at,
        )

    @staticmethod
    async def create_event(db, payload: AdminEventCreate, actor_id: UUID) -> AdminEventOut:
        org = (
            await db.execute(
                select(Organization).where(Organization.id == payload.organizer_org_id)
            )
        ).scalars().first()
        if org is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Organizacija nije pronađena")

        data = payload.model_dump()
        data["slug"] = await _unique_slug(db, payload.slug)

        event = Event(**data)
        db.add(event)
        db.add(AuditLog(
            actor_id=actor_id,
            action="create_event",
            resource_type="event",
            new_value={"name": event.name, "organizer_org_id": str(payload.organizer_org_id)},
        ))
        await db.commit()
        await db.refresh(event)

        return AdminEventOut(
            id=event.id, name=event.name, slug=event.slug,
            description=event.description, cover_image_url=event.cover_image_url,
            status=event.status, is_free=event.is_free,
            organizer_org_id=event.organizer_org_id, organizer_org_name=org.name,
            occurrence_count=0, event_date=event.event_date,
            location_name=event.location_name, ticket_price=event.ticket_price,
            created_at=event.created_at,
        )

    @staticmethod
    async def update_user(
        db, user_id: UUID, payload: AdminUpdateUser, actor_id: UUID
    ) -> AdminUserDetail:
        profile = (
            await db.execute(select(Profile).where(Profile.id == user_id))
        ).scalars().first()
        if profile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Korisnik nije pronađen")

        old_value = _json_safe({f: getattr(profile, f) for f in payload.model_fields})

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)

        db.add(AuditLog(
            actor_id=actor_id,
            action="update_user",
            resource_type="user",
            resource_id=str(user_id),
            old_value=old_value,
            new_value=_json_safe(payload.model_dump(exclude_unset=True)),
        ))
        await db.commit()
        return await AdminService.get_user(db, user_id)

    @staticmethod
    async def delete_user(db, user_id: UUID, actor_id: UUID) -> None:
        if actor_id == user_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Ne možeš obrisati vlastiti račun.",
            )

        profile = (
            await db.execute(select(Profile).where(Profile.id == user_id))
        ).scalars().first()
        if profile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Korisnik nije pronađen")

        old_value = {
            "email": profile.email,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
        }

        supabase_admin = await get_supabase_admin()
        try:
            await supabase_admin.auth.admin.delete_user(str(user_id))
        except Exception as e:
            msg = str(e)
            if "404" not in msg and "not found" not in msg.lower():
                raise HTTPException(
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
                    f"Supabase Auth brisanje nije uspjelo: {msg}",
                )

        await db.delete(profile)
        db.add(AuditLog(
            actor_id=actor_id,
            action="delete_user",
            resource_type="user",
            resource_id=str(user_id),
            old_value=old_value,
        ))
        await db.commit()
