from __future__ import annotations


import pytest


@pytest.mark.asyncio
async def test_auth_and_profile_flow(client) -> None:
    otp_request = await client.post("/v1/auth/request-otp", json={"phone": "+1 (999) 123-45-67"})
    assert otp_request.status_code == 200
    challenge = otp_request.json()
    assert challenge["dev_code"]

    verify = await client.post(
        "/v1/auth/verify-otp",
        json={
            "challenge_id": challenge["challenge_id"],
            "phone": "+19991234567",
            "otp_code": challenge["dev_code"],
            "display_name": "Route Pilot",
            "segment": "student",
        },
    )
    assert verify.status_code == 200
    payload = verify.json()
    assert payload["user"]["display_name"] == "Route Pilot"

    headers = {"Authorization": f"Bearer {payload['access_token']}"}
    me = await client.get("/v1/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user"]["phone"] == "+19991234567"

    profile = await client.get("/v1/profile", headers=headers)
    assert profile.status_code == 200
    assert len(profile.json()["quests"]) >= 4
