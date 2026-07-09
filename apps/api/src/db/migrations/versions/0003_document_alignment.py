"""Document alignment social and payment schema.

Revision ID: 0003_document_alignment
Revises: 0002_backend2_progress
Create Date: 2026-04-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0003_document_alignment"
down_revision = "0002_backend2_progress"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("nickname", sa.String(length=60), nullable=True))
    op.create_index(op.f("ix_users_nickname"), "users", ["nickname"], unique=True)

    op.create_table(
        "friends",
        sa.Column("friendship_id", sa.String(length=40), nullable=False),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("friend_id", sa.String(length=40), nullable=False),
        sa.Column("games_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["friend_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("friendship_id"),
        sa.UniqueConstraint("user_id", "friend_id", name="uq_friend_user_pair"),
    )
    op.create_index(op.f("ix_friends_user_id"), "friends", ["user_id"])
    op.create_index(op.f("ix_friends_friend_id"), "friends", ["friend_id"])

    op.create_table(
        "gifts",
        sa.Column("gift_id", sa.String(length=40), nullable=False),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("friend_id", sa.String(length=40), nullable=True),
        sa.Column("promocode", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["friend_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("gift_id"),
    )
    op.create_index(op.f("ix_gifts_user_id"), "gifts", ["user_id"])

    op.create_table(
        "payment_requests",
        sa.Column("payment_request_id", sa.String(length=40), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("payment_request_id"),
    )
    op.create_index(op.f("ix_payment_requests_user_id"), "payment_requests", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_payment_requests_user_id"), table_name="payment_requests")
    op.drop_table("payment_requests")
    op.drop_index(op.f("ix_gifts_user_id"), table_name="gifts")
    op.drop_table("gifts")
    op.drop_index(op.f("ix_friends_friend_id"), table_name="friends")
    op.drop_index(op.f("ix_friends_user_id"), table_name="friends")
    op.drop_table("friends")
    op.drop_index(op.f("ix_users_nickname"), table_name="users")
    op.drop_column("users", "nickname")
