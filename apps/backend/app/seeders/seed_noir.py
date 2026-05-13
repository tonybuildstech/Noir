"""
Noir Data Seeder
Seeds organizations, venues, layouts, and events for testing the Noir discovery feed.
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.noir import Organization, Event, Venue, VenueLayout, EventOccurrence, EventTier

async def seed_noir_data():
    async with AsyncSessionLocal() as db:
        print("🌱 Seeding realistic Noir test data for Zagreb...")
        
        # 1. Organizations
        orgs_data = [
            {
                "name": "Student Event Group (SEG)",
                "slug": "seg-zg",
                "can_organize": True,
                "can_own_venues": False
            },
            {
                "name": "Noćni Program",
                "slug": "nocni-program",
                "can_organize": True,
                "can_own_venues": False
            },
            {
                "name": "Kulturna Udruga Trešnjevka",
                "slug": "ku-tresnjevka",
                "can_organize": True,
                "can_own_venues": True
            },
            {
                "name": "Klub Studenata Elektrotehnike (KSET)",
                "slug": "kset-alumni",
                "can_organize": True,
                "can_own_venues": True
            }
        ]

        org_objects = {}
        for od in orgs_data:
            res = await db.execute(select(Organization).where(Organization.slug == od["slug"]))
            org = res.scalars().first()
            if not org:
                org = Organization(
                    id=uuid.uuid4(),
                    name=od["name"],
                    slug=od["slug"],
                    can_organize=od["can_organize"],
                    can_own_venues=od["can_own_venues"],
                    is_active=True,
                    is_verified=True
                )
                db.add(org)
                await db.flush()
                print(f"✅ Created Organization: {org.name}")
            else:
                print(f"ℹ️ Organization already exists: {org.name}")
            org_objects[od["slug"]] = org

        # 2. Venues
        venues_data = [
            {
                "name": "KSET",
                "slug": "kset",
                "address": "Unska 3",
                "city": "Zagreb",
                "capacity": 300,
                "org_slug": "kset-alumni"
            },
            {
                "name": "Tvornica Kulture",
                "slug": "tvornica-kulture",
                "address": "Šubićeva 2",
                "city": "Zagreb",
                "capacity": 1500,
                "org_slug": "ku-tresnjevka"
            },
            {
                "name": "Peti Kupe",
                "slug": "peti-kupe",
                "address": "Trnjanska cesta 5",
                "city": "Zagreb",
                "capacity": 600,
                "org_slug": "nocni-program"
            },
            {
                "name": "Močvara",
                "slug": "mocvara",
                "address": "Trnjanski nasip bb",
                "city": "Zagreb",
                "capacity": 500,
                "org_slug": "ku-tresnjevka"
            }
        ]

        venue_objects = {}
        layout_objects = {}
        for vd in venues_data:
            res = await db.execute(select(Venue).where(Venue.slug == vd["slug"]))
            venue = res.scalars().first()
            if not venue:
                venue = Venue(
                    id=uuid.uuid4(),
                    org_id=org_objects[vd["org_slug"]].id,
                    name=vd["name"],
                    slug=vd["slug"],
                    venue_type="club",
                    address=vd["address"],
                    city=vd["city"],
                    total_capacity=vd["capacity"]
                )
                db.add(venue)
                await db.flush()
                
                # Create default layout
                layout = VenueLayout(
                    id=uuid.uuid4(),
                    venue_id=venue.id,
                    version=1,
                    file_path=f"/venues/{venue.id}/v1.json",
                    total_capacity=vd["capacity"],
                    is_current=True
                )
                db.add(layout)
                await db.flush()
                layout_objects[vd["slug"]] = layout
                print(f"✅ Created Venue & Layout: {venue.name}")
            else:
                # Fetch layout for existing venue
                l_res = await db.execute(select(VenueLayout).where(VenueLayout.venue_id == venue.id, VenueLayout.is_current == True))
                layout = l_res.scalars().first()
                layout_objects[vd["slug"]] = layout
                print(f"ℹ️ Venue already exists: {venue.name}")
            venue_objects[vd["slug"]] = venue

        # 3. Events
        events_data = [
            {
                "name": "Brucošijada FER-a",
                "slug": "brucosijada-fer-2026",
                "desc": "Legendarni studentski festival na više stageeva. Nastupaju lokalni bendovi i trap zvijezde.",
                "org": "seg-zg",
                "venue": "tvornica-kulture",
                "price": Decimal("15.00"),
                "days_ahead": 14,
                "status": "published"
            },
            {
                "name": "Trap Ksetanje",
                "slug": "trap-ksetanje-v24",
                "desc": "Najbolji trap beatovi u gradu. Student friendly cijene pića.",
                "org": "seg-zg",
                "venue": "kset",
                "price": Decimal("5.00"),
                "days_ahead": 3,
                "status": "published"
            },
            {
                "name": "Indie-Pop Night",
                "slug": "indie-pop-mocvara",
                "desc": "Plesni indie hitovi, od Arctic Monkeysa do lokalnih indie nada.",
                "org": "ku-tresnjevka",
                "venue": "mocvara",
                "price": Decimal("7.00"),
                "days_ahead": 7,
                "status": "published"
            },
            {
                "name": "Techno na Nasipu",
                "slug": "techno-nasip",
                "desc": "Cjelonoćni techno session pod otvorenim nebom kod Močvare.",
                "org": "nocni-program",
                "venue": "mocvara",
                "price": Decimal("10.00"),
                "days_ahead": 10,
                "status": "published"
            },
            {
                "name": "Gornjogradske Večeri",
                "slug": "gornjogradske-veceri",
                "desc": "Akustični koncerti u intimnoj atmosferi Gornjeg Grada.",
                "org": "ku-tresnjevka",
                "venue": "peti-kupe",
                "price": Decimal("12.00"),
                "days_ahead": 5,
                "status": "published"
            }
        ]

        now = datetime.utcnow()

        for ed in events_data:
            res = await db.execute(select(Event).where(Event.slug == ed["slug"]))
            existing_ev = res.scalars().first()
            
            if not existing_ev:
                event = Event(
                    id=uuid.uuid4(),
                    organizer_org_id=org_objects[ed["org"]].id,
                    name=ed["name"],
                    slug=ed["slug"],
                    description=ed["desc"],
                    status=ed["status"],
                    min_age=18,
                    is_free=False
                )
                db.add(event)
                await db.flush()
                
                # Add occurrence
                occ_date = now + timedelta(days=ed["days_ahead"])
                occurrence = EventOccurrence(
                    id=uuid.uuid4(),
                    event_id=event.id,
                    venue_id=venue_objects[ed["venue"]].id,
                    venue_layout_id=layout_objects[ed["venue"]].id,
                    occurrence_date=occ_date.replace(hour=20, minute=0, second=0, microsecond=0, tzinfo=None),
                    start_time=occ_date.replace(hour=21, minute=0, second=0, microsecond=0, tzinfo=None),
                    status="on_sale",
                    total_capacity=venue_objects[ed["venue"]].total_capacity
                )
                db.add(occurrence)
                await db.flush()
                
                # Add Tier
                tier = EventTier(
                    id=uuid.uuid4(),
                    occurrence_id=occurrence.id,
                    name="Regular",
                    price=ed["price"],
                    total_count=venue_objects[ed["venue"]].total_capacity,
                    is_active=True
                )
                db.add(tier)
                print(f"✅ Created Event: {ed['name']}")
            else:
                print(f"ℹ️ Event already exists: {ed['name']}")

        await db.commit()
        print("✨ Noir seeding complete with realistic Zagreb data!")

if __name__ == "__main__":
    asyncio.run(seed_noir_data())
