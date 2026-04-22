from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MTB Galaxy API"
    env: str = "development"
    api_prefix: str = "/v1"
    database_url: str = "postgresql+asyncpg://mtb:mtb@localhost:5432/mtb_galaxy"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 30
    otp_ttl_seconds: int = 300
    otp_max_attempts: int = 5
    otp_dev_bypass: bool = True
    cors_origins: list[str] = ["http://localhost:8081"]
    auto_create_schema: bool = False
    seed_defaults: bool = False

    model_config = SettingsConfigDict(env_prefix="MTB_", env_file=".env", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
