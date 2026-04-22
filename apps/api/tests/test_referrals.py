from __future__ import annotations

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
async def test_referral_creates_invite_and_reward(client) -> None:
    auth = await login(client)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    create = await client.post("/v1/referrals", json={"invitee_phone": "+19995554433"}, headers=headers)
    assert create.status_code == 200
    payload = create.json()
    assert payload["invite_code"]

    referrals = await client.get("/v1/referrals", headers=headers)
    assert referrals.status_code == 200
    assert len(referrals.json()) == 1

    rewards = await client.get("/v1/rewards/ledger", headers=headers)
    assert any(item["reward_type"] == "referral_bonus" for item in rewards.json())
