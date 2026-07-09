from __future__ import annotations

from fastapi import Header, HTTPException, Request, status


async def require_internal_token(request: Request, x_internal_token: str | None = Header(default=None)) -> None:
    expected = request.app.state.settings.internal_api_key
    if expected and x_internal_token != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal token")
