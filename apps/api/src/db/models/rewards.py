from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, utcnow
from core.security import generate_id


class RewardLedger(Base):
    __tablename__ = "reward_ledger"

    ledger_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("ldg"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    reward_type: Mapped[str] = mapped_column(String(60))
    amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
