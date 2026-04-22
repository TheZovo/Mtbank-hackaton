"""Backend 1 schema updates for auth, profile, referrals and promocodes.

Revision ID: 0002_backend1_schema
Revises: 0001_initial
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

from common.enums import PlanetCode


revision = "0002_backend1_schema"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _get_table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _get_columns(table_name: str) -> set[str]:
    if table_name not in _get_table_names():
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _get_unique_constraints(table_name: str) -> list[dict]:
    if table_name not in _get_table_names():
        return []
    return sa.inspect(op.get_bind()).get_unique_constraints(table_name)


def _get_indexes(table_name: str) -> list[dict]:
    if table_name not in _get_table_names():
        return []
    return sa.inspect(op.get_bind()).get_indexes(table_name)


def _has_unique_constraint(table_name: str, column_names: list[str]) -> bool:
    expected = tuple(column_names)
    for constraint in _get_unique_constraints(table_name):
        if tuple(constraint.get("column_names") or ()) == expected:
            return True
    return False


def _drop_uniques_for_columns(table_name: str, column_names: list[str]) -> None:
    expected = tuple(column_names)
    for constraint in _get_unique_constraints(table_name):
        name = constraint.get("name")
        if name and tuple(constraint.get("column_names") or ()) == expected:
            op.drop_constraint(name, table_name, type_="unique")
    for index in _get_indexes(table_name):
        name = index.get("name")
        if name and index.get("unique") and tuple(index.get("column_names") or ()) == expected:
            op.drop_index(name, table_name=table_name)


def _sync_auth_sessions() -> None:
    if "auth_sessions" not in _get_table_names():
        return

    _drop_uniques_for_columns("auth_sessions", ["refresh_token_hash"])
    columns = _get_columns("auth_sessions")
    if "refresh_token_hash" in columns:
        refresh_token_hash = next(
            column
            for column in sa.inspect(op.get_bind()).get_columns("auth_sessions")
            if column["name"] == "refresh_token_hash"
        )
        if getattr(refresh_token_hash["type"], "length", None) != 255:
            op.alter_column(
                "auth_sessions",
                "refresh_token_hash",
                existing_type=sa.String(length=getattr(refresh_token_hash["type"], "length", 64) or 64),
                type_=sa.String(length=255),
                existing_nullable=False,
            )


def _sync_user_profiles() -> None:
    if "user_profiles" not in _get_table_names():
        return

    columns = _get_columns("user_profiles")
    default_planet = PlanetCode.ORBIT_COMMERCE.value

    if "focus_planet_id" not in columns:
        op.add_column(
            "user_profiles",
            sa.Column(
                "focus_planet_id",
                sa.String(length=40),
                nullable=True,
                server_default=sa.text(f"'{default_planet}'"),
            ),
        )
        op.execute(
            sa.text(
                "UPDATE user_profiles "
                "SET focus_planet_id = COALESCE(selected_planet, :default_planet) "
                "WHERE focus_planet_id IS NULL"
            ).bindparams(default_planet=default_planet)
        )
        op.alter_column(
            "user_profiles",
            "focus_planet_id",
            existing_type=sa.String(length=40),
            nullable=False,
        )

    if "invite_code" not in columns:
        op.add_column("user_profiles", sa.Column("invite_code", sa.String(length=20), nullable=True))

    if "invite_code" in _get_columns("user_profiles") and not _has_unique_constraint("user_profiles", ["invite_code"]):
        op.create_unique_constraint("uq_user_profiles_invite_code", "user_profiles", ["invite_code"])


def _sync_planet_states() -> None:
    if "planet_states" not in _get_table_names():
        return

    columns = _get_columns("planet_states")
    additions = [
        (
            "small_stars_current",
            sa.Column("small_stars_current", sa.Integer(), nullable=False, server_default=sa.text("0")),
        ),
        (
            "current_big_star",
            sa.Column("current_big_star", sa.Integer(), nullable=False, server_default=sa.text("0")),
        ),
        (
            "constellation_index",
            sa.Column("constellation_index", sa.Integer(), nullable=False, server_default=sa.text("1")),
        ),
        (
            "small_stars_period_counter",
            sa.Column("small_stars_period_counter", sa.Integer(), nullable=False, server_default=sa.text("0")),
        ),
        (
            "last_game_win_date",
            sa.Column("last_game_win_date", sa.Date(), nullable=True),
        ),
        (
            "cashback_percent",
            sa.Column("cashback_percent", sa.Float(), nullable=False, server_default=sa.text("2.5")),
        ),
        (
            "max_cashback_reached",
            sa.Column("max_cashback_reached", sa.Boolean(), nullable=False, server_default=sa.false()),
        ),
        (
            "total_constellations_completed",
            sa.Column("total_constellations_completed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        ),
    ]

    for column_name, column in additions:
        if column_name not in columns:
            op.add_column("planet_states", column)


def _sync_referrals() -> None:
    if "referrals" not in _get_table_names():
        return

    columns = _get_columns("referrals")

    if "referral_id" in columns and "id" not in columns:
        op.alter_column("referrals", "referral_id", new_column_name="id", existing_type=sa.String(length=40))
    if "inviter_user_id" in columns and "inviter_id" not in columns:
        op.alter_column("referrals", "inviter_user_id", new_column_name="inviter_id", existing_type=sa.String(length=40))
    if "invitee_phone" in columns and "invited_phone" not in columns:
        op.alter_column("referrals", "invitee_phone", new_column_name="invited_phone", existing_type=sa.String(length=20))
    if "state" in columns and "status" not in columns:
        op.alter_column("referrals", "state", new_column_name="status", existing_type=sa.String(length=20))

    if "invite_code" in _get_columns("referrals"):
        _drop_uniques_for_columns("referrals", ["invite_code"])
        op.drop_column("referrals", "invite_code")


def _create_game_attempts() -> None:
    if "game_attempts" in _get_table_names():
        return

    op.create_table(
        "game_attempts",
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("attempts_used", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "date"),
    )


def _create_promocodes() -> None:
    if "promocodes" in _get_table_names():
        return

    op.create_table(
        "promocodes",
        sa.Column("promocode_id", sa.String(length=40), nullable=False),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("planet_id", sa.String(length=40), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("promocode_id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_promocodes_user_id", "promocodes", ["user_id"])
    op.create_index("ix_promocodes_planet_id", "promocodes", ["planet_id"])


def upgrade() -> None:
    _sync_auth_sessions()
    _sync_user_profiles()
    _sync_planet_states()
    _sync_referrals()
    _create_game_attempts()
    _create_promocodes()


def downgrade() -> None:
    if "promocodes" in _get_table_names():
        op.drop_index("ix_promocodes_planet_id", table_name="promocodes")
        op.drop_index("ix_promocodes_user_id", table_name="promocodes")
        op.drop_table("promocodes")

    if "game_attempts" in _get_table_names():
        op.drop_table("game_attempts")

    if "referrals" in _get_table_names():
        columns = _get_columns("referrals")
        if "invite_code" not in columns:
            op.add_column("referrals", sa.Column("invite_code", sa.String(length=20), nullable=True))
            op.create_unique_constraint("uq_referrals_invite_code", "referrals", ["invite_code"])
        if "status" in _get_columns("referrals") and "state" not in _get_columns("referrals"):
            op.alter_column("referrals", "status", new_column_name="state", existing_type=sa.String(length=20))
        if "invited_phone" in _get_columns("referrals") and "invitee_phone" not in _get_columns("referrals"):
            op.alter_column(
                "referrals",
                "invited_phone",
                new_column_name="invitee_phone",
                existing_type=sa.String(length=20),
            )
        if "inviter_id" in _get_columns("referrals") and "inviter_user_id" not in _get_columns("referrals"):
            op.alter_column(
                "referrals",
                "inviter_id",
                new_column_name="inviter_user_id",
                existing_type=sa.String(length=40),
            )
        if "id" in _get_columns("referrals") and "referral_id" not in _get_columns("referrals"):
            op.alter_column("referrals", "id", new_column_name="referral_id", existing_type=sa.String(length=40))

    if "planet_states" in _get_table_names():
        for column_name in (
            "total_constellations_completed",
            "max_cashback_reached",
            "cashback_percent",
            "last_game_win_date",
            "small_stars_period_counter",
            "constellation_index",
            "current_big_star",
            "small_stars_current",
        ):
            if column_name in _get_columns("planet_states"):
                op.drop_column("planet_states", column_name)

    if "user_profiles" in _get_table_names():
        if _has_unique_constraint("user_profiles", ["invite_code"]):
            _drop_uniques_for_columns("user_profiles", ["invite_code"])
        if "invite_code" in _get_columns("user_profiles"):
            op.drop_column("user_profiles", "invite_code")
        if "focus_planet_id" in _get_columns("user_profiles"):
            op.drop_column("user_profiles", "focus_planet_id")

    if "auth_sessions" in _get_table_names() and "refresh_token_hash" in _get_columns("auth_sessions"):
        refresh_token_hash = next(
            column
            for column in sa.inspect(op.get_bind()).get_columns("auth_sessions")
            if column["name"] == "refresh_token_hash"
        )
        if getattr(refresh_token_hash["type"], "length", None) != 64:
            op.alter_column(
                "auth_sessions",
                "refresh_token_hash",
                existing_type=sa.String(length=getattr(refresh_token_hash["type"], "length", 255) or 255),
                type_=sa.String(length=64),
                existing_nullable=False,
            )
        if not _has_unique_constraint("auth_sessions", ["refresh_token_hash"]):
            op.create_unique_constraint("uq_auth_sessions_refresh_token_hash", "auth_sessions", ["refresh_token_hash"])
