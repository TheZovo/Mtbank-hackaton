"""Backend 2 progress, games, leaderboard schema.

Revision ID: 0002_backend2_progress
Revises: 0001_initial
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_backend2_progress"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("focus_planet_id", sa.String(length=40), nullable=True))
    op.add_column("planet_states", sa.Column("small_stars_current", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("planet_states", sa.Column("current_big_star", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("planet_states", sa.Column("constellation_index", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("planet_states", sa.Column("small_stars_period_counter", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("planet_states", sa.Column("last_game_win_date", sa.Date(), nullable=True))
    op.add_column("planet_states", sa.Column("cashback_percent", sa.Float(), nullable=False, server_default="0"))
    op.add_column("planet_states", sa.Column("max_cashback_reached", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("planet_states", sa.Column("total_constellations_completed", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "game_attempts",
        sa.Column("attempt_id", sa.String(length=40), nullable=False),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("attempts_used", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("attempt_id"),
        sa.UniqueConstraint("user_id", "date", name="uq_game_attempt_user_date"),
    )
    op.create_index(op.f("ix_game_attempts_user_id"), "game_attempts", ["user_id"])
    op.create_index(op.f("ix_game_attempts_date"), "game_attempts", ["date"])

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
    op.drop_index(op.f("ix_game_attempts_date"), table_name="game_attempts")
    op.drop_index(op.f("ix_game_attempts_user_id"), table_name="game_attempts")
    op.drop_table("game_attempts")

    op.drop_column("planet_states", "total_constellations_completed")
    op.drop_column("planet_states", "max_cashback_reached")
    op.drop_column("planet_states", "cashback_percent")
    op.drop_column("planet_states", "last_game_win_date")
    op.drop_column("planet_states", "small_stars_period_counter")
    op.drop_column("planet_states", "constellation_index")
    op.drop_column("planet_states", "current_big_star")
    op.drop_column("planet_states", "small_stars_current")
    op.drop_column("user_profiles", "focus_planet_id")
