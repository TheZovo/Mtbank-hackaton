from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime

from redis.asyncio import Redis

from core.config import Settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class OtpStoreRecord:
    challenge_id: str
    phone: str
    code_hash: str
    expires_at: str
    attempts: int


class MemoryOtpStore:
    def __init__(self) -> None:
        self._records: dict[str, OtpStoreRecord] = {}

    async def set(self, record: OtpStoreRecord, ttl_seconds: int) -> None:
        self._records[record.challenge_id] = record

    async def get(self, challenge_id: str) -> OtpStoreRecord | None:
        record = self._records.get(challenge_id)
        if record is None:
            return None
        expires_at = datetime.fromisoformat(record.expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= datetime.now(UTC):
            self._records.pop(challenge_id, None)
            return None
        return record

    async def delete(self, challenge_id: str) -> None:
        self._records.pop(challenge_id, None)

    async def close(self) -> None:
        return None


class RedisOtpStore:
    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client

    async def set(self, record: OtpStoreRecord, ttl_seconds: int) -> None:
        await self.redis.set(f"otp:{record.challenge_id}", json.dumps(asdict(record)), ex=ttl_seconds)

    async def get(self, challenge_id: str) -> OtpStoreRecord | None:
        payload = await self.redis.get(f"otp:{challenge_id}")
        if payload is None:
            return None
        data = json.loads(payload)
        return OtpStoreRecord(**data)

    async def delete(self, challenge_id: str) -> None:
        await self.redis.delete(f"otp:{challenge_id}")

    async def close(self) -> None:
        await self.redis.aclose()
async def build_otp_store(settings: Settings):
    try:
        redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
        await redis_client.ping()
        return RedisOtpStore(redis_client)
    except Exception:
        logger.warning("Redis unavailable, falling back to in-memory OTP store", exc_info=True)
        return MemoryOtpStore()
