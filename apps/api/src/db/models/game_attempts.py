from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class GameAttempt(Base):
    __tablename__ = "game_attempts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    attempt_date: Mapped[date] = mapped_column("date", Date, primary_key=True)
    attempts_used: Mapped[int] = mapped_column(Integer, default=0)
