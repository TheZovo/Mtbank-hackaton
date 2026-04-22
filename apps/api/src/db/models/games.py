from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.security import generate_id
from db.base import Base, utcnow


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
