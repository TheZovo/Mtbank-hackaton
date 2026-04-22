from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, utcnow


class Quest(Base):
    __tablename__ = "quests"

    quest_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(140))
    description: Mapped[str] = mapped_column(Text)
    planet_code: Mapped[str] = mapped_column(String(40))
    category: Mapped[str] = mapped_column(String(40), default="daily")
    condition_type: Mapped[str] = mapped_column(String(60))
    threshold: Mapped[float] = mapped_column(Float)
    reward_kind: Mapped[str] = mapped_column(String(40))
    reward_value: Mapped[float] = mapped_column(Float)
    stars_reward: Mapped[int] = mapped_column(Integer, default=1)
    display_order: Mapped[int] = mapped_column(Integer, default=100)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class QuestProgress(Base):
    __tablename__ = "quest_progress"
    __table_args__ = (UniqueConstraint("user_id", "quest_id", name="uq_quest_progress_user_quest"),)

    progress_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    quest_id: Mapped[str] = mapped_column(ForeignKey("quests.quest_id", ondelete="CASCADE"), index=True)
    current_value: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
