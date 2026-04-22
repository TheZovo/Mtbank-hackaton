from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, utcnow
from core.security import generate_id


class GameRun(Base):
    __tablename__ = "game_runs"

    run_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("run"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    game_code: Mapped[str] = mapped_column(String(40), index=True)
    planet_code: Mapped[str] = mapped_column(String(40), index=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    base_reward: Mapped[int] = mapped_column(Integer, default=0)
    total_reward: Mapped[int] = mapped_column(Integer, default=0)
    bonus_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class GameAttempt(Base):
    __tablename__ = "game_attempts"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_game_attempt_user_date"),)

    attempt_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("gat"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    attempts_used: Mapped[int] = mapped_column(Integer, default=0)
