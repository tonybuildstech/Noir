from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import HTTPException

from app.models.noir import Event, Organization, Venue, EventOccurrence, EventTier
from app.schemas.noir import (
    EventCreate, EventUpdate, EventDiscoveryOut, 
    OrganizationCreate, OrganizationUpdate,
    VenueCreate, VenueUpdate
)
from app.services.rbac import require_org_authority

class NoirService:
    @staticmethod
    async def list_events(
        db: AsyncSession, 
        status: Optional[str] = "published", 
        org_id: Optional[UUID] = None
    ) -> List[EventDiscoveryOut]:
        stmt = select(Event).options(
            selectinload(Event.occurrences).selectinload(EventOccurrence.venue),
            selectinload(Event.occurrences).selectinload(EventOccurrence.tiers)
        )
        
        if status:
            stmt = stmt.where(Event.status == status)
        if org_id:
            stmt = stmt.where(Event.organizer_org_id == org_id)
            
        result = await db.execute(stmt)
        events = result.scalars().all()
        
        out_events = []
        for event in events:
            out_ev = EventDiscoveryOut.model_validate(event)
            if event.occurrences:
                primary = sorted(event.occurrences, key=lambda x: x.start_time)[0]
                out_ev.venue_name = primary.venue.name if primary.venue else event.location_name
                out_ev.occurrence_date = primary.start_time
                if primary.tiers:
                    out_ev.min_price = min(t.price for t in primary.tiers)
                else:
                    out_ev.min_price = Decimal("0.00") if event.is_free else event.ticket_price
            else:
                out_ev.venue_name = event.location_name
                out_ev.occurrence_date = event.event_date
                out_ev.min_price = Decimal("0.00") if event.is_free else event.ticket_price
            out_events.append(out_ev)
        return out_events

    @staticmethod
    async def get_event(db: AsyncSession, event_id: UUID) -> Event:
        stmt = select(Event).where(Event.id == event_id)
        result = await db.execute(stmt)
        event = result.scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return event

    @staticmethod
    async def create_event(db: AsyncSession, user_id: UUID, payload: EventCreate) -> Event:
        check_auth = require_org_authority()
        await check_auth(db, user_id, payload.organizer_org_id)
        
        new_event = Event(**payload.model_dump())
        db.add(new_event)
        await db.commit()
        await db.refresh(new_event)
        return new_event

    @staticmethod
    async def update_event(db: AsyncSession, user_id: UUID, event_id: UUID, payload: EventUpdate) -> Event:
        event = await NoirService.get_event(db, event_id)
        
        check_auth = require_org_authority()
        await check_auth(db, user_id, event.organizer_org_id)

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(event, field, value)
        
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def list_organizations(db: AsyncSession) -> List[Organization]:
        stmt = select(Organization).where(Organization.is_active == True)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_organization(db: AsyncSession, org_id: UUID) -> Organization:
        stmt = select(Organization).where(Organization.id == org_id).options(
            selectinload(Organization.venues)
        )
        result = await db.execute(stmt)
        org = result.scalars().first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        return org

    @staticmethod
    async def create_organization(db: AsyncSession, payload: OrganizationCreate) -> Organization:
        new_org = Organization(**payload.model_dump())
        db.add(new_org)
        await db.commit()
        await db.refresh(new_org)
        return new_org

    @staticmethod
    async def update_organization(db: AsyncSession, user_id: UUID, org_id: UUID, payload: OrganizationUpdate) -> Organization:
        org = await NoirService.get_organization(db, org_id)
        
        # Authority check specifically for the org being updated
        check_auth = require_org_authority(allowed_org_roles=("owner",))
        await check_auth(db, user_id, org_id)

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(org, field, value)
        
        await db.commit()
        await db.refresh(org)
        return org

    @staticmethod
    async def list_venues(db: AsyncSession, city: Optional[str] = None) -> List[Venue]:
        stmt = select(Venue).where(Venue.is_active == True)
        if city:
            stmt = stmt.where(Venue.city.ilike(f"%{city}%"))
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_venue(db: AsyncSession, venue_id: UUID) -> Venue:
        stmt = select(Venue).where(Venue.id == venue_id)
        result = await db.execute(stmt)
        venue = result.scalars().first()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        return venue

    @staticmethod
    async def create_venue(db: AsyncSession, user_id: UUID, payload: VenueCreate) -> Venue:
        check_auth = require_org_authority()
        await check_auth(db, user_id, payload.org_id)
            
        new_venue = Venue(**payload.model_dump())
        db.add(new_venue)
        await db.commit()
        await db.refresh(new_venue)
        return new_venue
