from __future__ import annotations

from pydantic import BaseModel


class FriendAddRequest(BaseModel):
    user_id: str
    friend_id: str


class FriendEntryOut(BaseModel):
    id: str
    nickname: str
    games_played: int


class PlayTogetherRequest(BaseModel):
    user_id: str
    friend_id: str


class PlayTogetherResponse(BaseModel):
    gift: bool
    promocode: str | None = None


class SimpleSuccessResponse(BaseModel):
    success: bool
