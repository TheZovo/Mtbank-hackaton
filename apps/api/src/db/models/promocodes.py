from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.security import generate_id
from db.base import Base, utcnow


class PromoCode(Base):
    __tablename__ = "promocodes"

    promocode_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("prm"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    planet_id: Mapped[str] = mapped_column(String(40), index=True)
    code: Mapped[str] = mapped_column(String(80), unique=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
