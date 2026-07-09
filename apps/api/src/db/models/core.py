from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.enums import BoosterStatus, PlanetCode, SegmentKey
from core.security import generate_id
from db.base import Base, utcnow


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("usr"))
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    nickname: Mapped[str | None] = mapped_column(String(60), unique=True, index=True, nullable=True)
    segment: Mapped[str] = mapped_column(String(40), default=SegmentKey.STUDENT.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    planet_states = relationship("PlanetState", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    orbit_level: Mapped[int] = mapped_column(Integer, default=1)
    total_energy: Mapped[int] = mapped_column(Integer, default=0)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    stardust: Mapped[int] = mapped_column(Integer, default=0)
    bonus_streak: Mapped[int] = mapped_column(Integer, default=0)
    vault_charge: Mapped[int] = mapped_column(Integer, default=0)
    vault_crates: Mapped[int] = mapped_column(Integer, default=0)
    selected_planet: Mapped[str] = mapped_column(String(40), default=PlanetCode.ORBIT_COMMERCE.value)
    focus_planet_id: Mapped[str] = mapped_column(String(40), default=PlanetCode.ORBIT_COMMERCE.value)
    invite_code: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    current_limit: Mapped[float] = mapped_column(Float, default=150.0)
    available_limit: Mapped[float] = mapped_column(Float, default=150.0)
    risk_score: Mapped[int] = mapped_column(Integer, default=15)
    on_time_payments_3m: Mapped[int] = mapped_column(Integer, default=0)
    late_flags: Mapped[int] = mapped_column(Integer, default=0)
    rating_score: Mapped[int] = mapped_column(Integer, default=320)
    bank_rank: Mapped[str] = mapped_column(String(40), default="Bronze Voyager")
    cashback_balance: Mapped[float] = mapped_column(Float, default=0)
    bonus_points: Mapped[int] = mapped_column(Integer, default=0)
    rating_boost: Mapped[int] = mapped_column(Integer, default=0)
    total_stars: Mapped[int] = mapped_column(Integer, default=0)
    completed_quests: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="profile")


class PlanetState(Base):
    __tablename__ = "planet_states"
    __table_args__ = (UniqueConstraint("user_id", "planet_code", name="uq_planet_state_user_planet"),)

    planet_state_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("pln"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    planet_code: Mapped[str] = mapped_column(String(40))
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    mastery: Mapped[int] = mapped_column(Integer, default=0)
    small_stars_current: Mapped[int] = mapped_column(Integer, default=0)
    current_big_star: Mapped[int] = mapped_column(Integer, default=0)
    constellation_index: Mapped[int] = mapped_column(Integer, default=0)
    small_stars_period_counter: Mapped[int] = mapped_column(Integer, default=0)
    last_game_win_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cashback_percent: Mapped[float] = mapped_column(Float, default=1.0)
    max_cashback_reached: Mapped[bool] = mapped_column(Boolean, default=False)
    total_constellations_completed: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="planet_states")


class BoosterWindow(Base):
    __tablename__ = "booster_windows"

    booster_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("bst"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(60))
    boost_rate: Mapped[float] = mapped_column(Float, default=0)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default=BoosterStatus.ACTIVE.value)


class ActivityLog(Base):
    __tablename__ = "activity_log"

    activity_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("act"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(140))
    detail: Mapped[str] = mapped_column(Text)
    reward: Mapped[int] = mapped_column(Integer, default=0)
    planet_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="activities")


class LeaderboardPeriod(Base):
    __tablename__ = "leaderboard_periods"

    period_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: generate_id("lbp"))
    planet_id: Mapped[str] = mapped_column(String(40), index=True)
    period_type: Mapped[str] = mapped_column(String(20), default="week")
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    snapshot: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MccToPlanet(Base):
    __tablename__ = "mcc_to_planet"

    mcc_code: Mapped[str] = mapped_column(String(8), primary_key=True)
    planet_id: Mapped[str] = mapped_column(String(40), index=True)
    description: Mapped[str | None] = mapped_column(String(160), nullable=True)
