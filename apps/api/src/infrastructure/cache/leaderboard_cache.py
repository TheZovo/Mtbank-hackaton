from __future__ import annotations

import json
import logging
import time

from redis.asyncio import Redis

from core.config import Settings

logger = logging.getLogger(__name__)


class MemoryLeaderboardCache:
    def __init__(self) -> None:
        self._records: dict[str, tuple[float, dict]] = {}

    async def get(self, key: str) -> dict | None:
        item = self._records.get(key)
        if item is None:
            return None
        expires_at, payload = item
        if expires_at <= time.time():
            self._records.pop(key, None)
            return None
        return payload

    async def set(self, key: str, payload: dict, ttl_seconds: int) -> None:
        self._records[key] = (time.time() + ttl_seconds, payload)

    async def delete_prefix(self, prefix: str) -> None:
        for key in [key for key in self._records if key.startswith(prefix)]:
            self._records.pop(key, None)

    async def close(self) -> None:
        return None


class RedisLeaderboardCache:
    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client

    async def get(self, key: str) -> dict | None:
        payload = await self.redis.get(key)
        return json.loads(payload) if payload else None

    async def set(self, key: str, payload: dict, ttl_seconds: int) -> None:
        await self.redis.set(key, json.dumps(payload), ex=ttl_seconds)

    async def delete_prefix(self, prefix: str) -> None:
        keys = [key async for key in self.redis.scan_iter(f"{prefix}*")]
        if keys:
            await self.redis.delete(*keys)

    async def close(self) -> None:
        await self.redis.aclose()


async def build_leaderboard_cache(settings: Settings):
    try:
        redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
        await redis_client.ping()
        return RedisLeaderboardCache(redis_client)
    except Exception:
        logger.warning("Redis unavailable, falling back to in-memory leaderboard cache", exc_info=True)
        return MemoryLeaderboardCache()
