from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_auth_and_profile_flow(client) -> None:
    otp_request = await client.post("/v1/auth/request-otp", json={"phone": "+1 (999) 123-45-67"})
    assert otp_request.status_code == 200
    challenge = otp_request.json()
    assert challenge["message"] == "OTP sent"
    assert challenge["challenge_id"]
    assert challenge["dev_otp"]
    assert challenge["dev_code"] == challenge["dev_otp"]

    verify = await client.post(
        "/v1/auth/verify-otp",
        json={
            "challenge_id": challenge["challenge_id"],
            "phone": "+19991234567",
            "code": challenge["dev_otp"],
            "name": "Route Pilot",
            "segment": "student",
        },
    )
    assert verify.status_code == 200
    payload = verify.json()
    assert payload["user"]["id"]
    assert payload["user"]["name"] == "Route Pilot"
    assert payload["refresh_token"]

    headers = {"Authorization": f"Bearer {payload['access_token']}"}
    me = await client.get("/v1/me", headers=headers)
    assert me.status_code == 200
    me_payload = me.json()
    assert me_payload["id"] == payload["user"]["id"]
    assert me_payload["phone"] == "+19991234567"
    assert me_payload["name"] == "Route Pilot"
    assert me_payload["daily_game_attempts_used"] == 0
    assert me_payload["daily_game_attempts_limit"] == 5
    assert me_payload["user"]["display_name"] == "Route Pilot"

    refresh = await client.post("/v1/auth/refresh", json={"refresh_token": payload["refresh_token"]})
    assert refresh.status_code == 200
    refreshed = refresh.json()
    assert refreshed["refresh_token"] != payload["refresh_token"]

    stale_refresh = await client.post("/v1/auth/refresh", json={"refresh_token": payload["refresh_token"]})
    assert stale_refresh.status_code == 401

    logout = await client.post("/v1/auth/logout", headers=headers)
    assert logout.status_code == 204

    revoked_me = await client.get("/v1/me", headers=headers)
    assert revoked_me.status_code == 401
