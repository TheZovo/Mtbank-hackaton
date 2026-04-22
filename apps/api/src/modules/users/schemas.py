from __future__ import annotations

from pydantic import BaseModel, field_validator


class UserByNicknameRequest(BaseModel):
    nickname: str
    user_id: str | None = None

    @field_validator("nickname")
    @classmethod
    def normalize_nickname(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("nickname is required")
        return normalized


class UserByNicknameResponse(BaseModel):
    id: str
    nickname: str
