"""Backend 2 progress, games, leaderboard schema.

Revision ID: 0002_backend2_progress
Revises: 0002_backend1_schema
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_backend2_progress"
down_revision = "0002_backend1_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leaderboard_periods",
        sa.Column("period_id", sa.String(length=40), nullable=False),
        sa.Column("planet_id", sa.String(length=40), nullable=False),
        sa.Column("period_type", sa.String(length=20), nullable=False, server_default="week"),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("snapshot", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("period_id"),
    )
    op.create_index(op.f("ix_leaderboard_periods_planet_id"), "leaderboard_periods", ["planet_id"])

    op.create_table(
        "mcc_to_planet",
        sa.Column("mcc_code", sa.String(length=8), nullable=False),
        sa.Column("planet_id", sa.String(length=40), nullable=False),
        sa.Column("description", sa.String(length=160), nullable=True),
        sa.PrimaryKeyConstraint("mcc_code"),
    )
    op.create_index(op.f("ix_mcc_to_planet_planet_id"), "mcc_to_planet", ["planet_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_mcc_to_planet_planet_id"), table_name="mcc_to_planet")
    op.drop_table("mcc_to_planet")
    op.drop_index(op.f("ix_leaderboard_periods_planet_id"), table_name="leaderboard_periods")
    op.drop_table("leaderboard_periods")
