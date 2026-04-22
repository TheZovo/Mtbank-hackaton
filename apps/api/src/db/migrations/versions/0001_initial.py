"""Initial mobile-first schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op

from db.base import Base
import db.models  # noqa: F401

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
