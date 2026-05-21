"""add_onboarding_role_fields

Revision ID: bfcb40abfec3
Revises: 008_insert_default_user_role
Create Date: 2026-05-19 12:55:01.646456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'bfcb40abfec3'
down_revision: Union[str, None] = '008_insert_default_user_role'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create verification_status enum
    verification_status = postgresql.ENUM('none', 'pending', 'approved', 'rejected', name='verification_status')
    verification_status.create(op.get_bind())

    # Add columns to profiles
    op.add_column('profiles', sa.Column('organization_name', sa.String(length=255), nullable=True))
    op.add_column('profiles', sa.Column('tax_id', sa.String(length=100), nullable=True))
    op.add_column('profiles', sa.Column('role_request', postgresql.ARRAY(sa.String()), nullable=True, server_default='{}'))
    op.add_column('profiles', sa.Column('verification_status', sa.Enum('none', 'pending', 'approved', 'rejected', name='verification_status'), server_default='none', nullable=False))


def downgrade() -> None:
    op.drop_column('profiles', 'verification_status')
    op.drop_column('profiles', 'role_request')
    op.drop_column('profiles', 'tax_id')
    op.drop_column('profiles', 'organization_name')

    # Drop verification_status enum
    verification_status = postgresql.ENUM('none', 'pending', 'approved', 'rejected', name='verification_status')
    verification_status.drop(op.get_bind())
