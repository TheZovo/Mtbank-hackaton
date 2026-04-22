from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, utcnow
from core.security import generate_id


class Referral(Base):
    __tablename__ = "referrals"

    referral_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("ref"))
    inviter_user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    invitee_phone: Mapped[str] = mapped_column(String(20))
    state: Mapped[str] = mapped_column(String(20), default="invited")
    invite_code: Mapped[str] = mapped_column(String(20), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
