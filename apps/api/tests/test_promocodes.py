from __future__ import annotations

import pytest


async def login(client, phone: str = "+19990000003") -> dict:
    challenge = (await client.post("/v1/auth/request-otp", json={"phone": phone})).json()
    verify = await client.post(
        "/v1/auth/verify-otp",
        json={
            "challenge_id": challenge["challenge_id"],
            "phone": phone,
            "otp_code": challenge["dev_code"],
            "display_name": "Promo Pilot",
        },
    )
    return verify.json()


@pytest.mark.asyncio
async def test_promocodes_returns_current_user_codes(client) -> None:
    auth = await login(client)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    response = await client.get("/v1/promocodes", headers=headers)
    assert response.status_code == 200
    assert response.json() == []
