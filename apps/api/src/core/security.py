from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt

from core.config import Settings


PHONE_RE = re.compile(r"\D+")


def utcnow() -> datetime:
    return datetime.now(UTC)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def normalize_phone(value: str) -> str:
    digits = PHONE_RE.sub("", value)
    if len(digits) < 11:
        raise ValueError("Введите корректный номер телефона")
    return f"+{digits}"


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def verify_secret(raw_value: str, hashed_value: str) -> bool:
    return hmac.compare_digest(hash_secret(raw_value), hashed_value)


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def make_display_name(phone: str) -> str:
    return f"Игрок {phone[-4:]}"


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(*, settings: Settings, user_id: str, session_id: str) -> tuple[str, int]:
    expires_in_seconds = settings.access_token_ttl_minutes * 60
    payload = {
        "sub": user_id,
        "sid": session_id,
        "type": "access",
        "iat": utcnow(),
        "exp": utcnow() + timedelta(seconds=expires_in_seconds),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, expires_in_seconds


def decode_access_token(token: str, settings: Settings) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


@dataclass(slots=True)
class BonusBreakdown:
    base_reward: int
    streak_bonus: int
    mastery_bonus: int
    performance_bonus: int
    focus_bonus: int
    total_reward: int
    charge_gain: int
    crates_earned: int
    next_vault_charge: int
    next_streak: int
    next_mastery: int
