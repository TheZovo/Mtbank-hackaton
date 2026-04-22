from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest


async def login(client, phone: str = "+19990000002") -> dict:
    challenge = (await client.post("/v1/auth/request-otp", json={"phone": phone})).json()
    verify = await client.post(
        "/v1/auth/verify-otp",
        json={
            "challenge_id": challenge["challenge_id"],
            "phone": phone,
            "otp_code": challenge["dev_code"],
            "display_name": "Social Pilot",
        },
    )
    return verify.json()


@pytest.mark.asyncio
async def test_referral_creates_invite_and_calls_progression_service(client) -> None:
    auth = await login(client)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    initial = await client.get("/v1/referrals", headers=headers)
    assert initial.status_code == 200
    initial_payload = initial.json()
    assert initial_payload["invite_code"]
    assert initial_payload["referrals"] == []

    with patch("modules.referrals.service.add_small_star", new_callable=AsyncMock) as add_small_star_mock:
        create = await client.post("/v1/referrals", json={"phone": "+19995554433"}, headers=headers)

    assert create.status_code == 200
    payload = create.json()
    assert payload["status"] == "ok"
    assert payload["invite_code"] == initial_payload["invite_code"]
    add_small_star_mock.assert_awaited_once()
    assert add_small_star_mock.await_args.kwargs["planet_id"] == "ORBIT_COMMERCE"
    assert add_small_star_mock.await_args.kwargs["source"] == "referral"

    referrals = await client.get("/v1/referrals", headers=headers)
    assert referrals.status_code == 200
    referrals_payload = referrals.json()
    assert referrals_payload["invite_code"] == initial_payload["invite_code"]
    assert len(referrals_payload["referrals"]) == 1
    assert referrals_payload["referrals"][0]["phone"] == "+19995554433"
    assert referrals_payload["referrals"][0]["stars_earned"] == 1

    quests = await client.get("/v1/quests", headers=headers)
    assert quests.status_code == 200
    social_quest = next(item for item in quests.json() if item["quest_id"] == "quest_social_001")
    assert social_quest["status"] == "completed"
