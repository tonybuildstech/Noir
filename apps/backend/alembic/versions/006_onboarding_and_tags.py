"""Add onboarding_completed to profiles and seed tags.

Revision ID: 006_onboarding_and_tags
Revises: 637eff380679
Create Date: 2026-05-14

- Adds `profiles.onboarding_completed` (default false)
- Ensures the `tags` table exists (already in v6 schema, but kept idempotent)
- Seeds music genres + event types used by the onboarding wizard
"""
from typing import Sequence, Union

from alembic import op


revision: str = "006_onboarding_and_tags"
down_revision: Union[str, None] = "637eff380679"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


GENRES = [
    ("Techno", "techno"),
    ("House", "house"),
    ("Tech House", "tech-house"),
    ("Trance", "trance"),
    ("Drum & Bass", "drum-and-bass"),
    ("Hip-Hop", "hip-hop"),
    ("R&B", "rnb"),
    ("Trap", "trap"),
    ("Pop", "pop"),
    ("Rock", "rock"),
    ("Indie", "indie"),
    ("Jazz", "jazz"),
    ("Soul & Funk", "soul-funk"),
    ("Reggae", "reggae"),
    ("Afrobeats", "afrobeats"),
    ("Reggaeton", "reggaeton"),
    ("Electronic", "electronic"),
    ("Alternativa", "alternative"),
]

EVENT_TYPES = [
    ("Club Night", "club-night"),
    ("Festival", "festival"),
    ("Koncert / Live", "concert"),
    ("Studentska noć", "student-night"),
    ("Rooftop party", "rooftop"),
    ("Open Air", "open-air"),
    ("After Party", "after-party"),
    ("DJ Set", "dj-set"),
    ("Stand-up komedija", "stand-up"),
    ("Tematska žurka", "themed-party"),
    ("Akustično / Intimno", "acoustic"),
    ("Kulturni event", "cultural"),
    ("Plažna žurka", "beach-party"),
    ("Pub Kviz", "pub-quiz"),
]


def upgrade() -> None:
    # 1. Add onboarding_completed to profiles
    op.execute(
        "ALTER TABLE profiles "
        "ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE"
    )

    # 2. Ensure tags table exists (idempotent — v6 schema already has it,
    #    but local dev DBs may not)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tags (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(100) UNIQUE NOT NULL,
            slug        VARCHAR(100) UNIQUE NOT NULL,
            category    VARCHAR(50),
            is_active   BOOLEAN DEFAULT TRUE,
            created_at  TIMESTAMPTZ DEFAULT NOW(),
            updated_at  TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_tags_slug ON tags(slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tags_category ON tags(category)")

    # 3. Seed genres + event types (idempotent via ON CONFLICT on slug)
    for name, slug in GENRES:
        op.execute(
            f"INSERT INTO tags (name, slug, category, is_active) "
            f"VALUES ('{name.replace(chr(39), chr(39)*2)}', '{slug}', 'genre', TRUE) "
            f"ON CONFLICT (slug) DO NOTHING"
        )
    for name, slug in EVENT_TYPES:
        op.execute(
            f"INSERT INTO tags (name, slug, category, is_active) "
            f"VALUES ('{name.replace(chr(39), chr(39)*2)}', '{slug}', 'event_type', TRUE) "
            f"ON CONFLICT (slug) DO NOTHING"
        )


def downgrade() -> None:
    # Remove seeded rows
    seeded_slugs = [s for _, s in GENRES] + [s for _, s in EVENT_TYPES]
    slug_list = ",".join(f"'{s}'" for s in seeded_slugs)
    op.execute(f"DELETE FROM tags WHERE slug IN ({slug_list})")

    # Drop onboarding column
    op.execute("ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed")
