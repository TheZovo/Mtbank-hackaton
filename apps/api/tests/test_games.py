from __future__ import annotations

import pytest


async def login(client, phone: str = "+19990000001") -> dict:
    challenge = (await client.post("/v1/auth/request-otp", json={"phone": phone})).json()
    verify = await client.post(
        "/v1/auth/verify-otp",
        json={
            "challenge_id": challenge["challenge_id"],
            "phone": phone,
            "otp_code": challenge["dev_code"],
            "display_name": "Game Pilot",
        },
    )
    return verify.json()


@pytest.mark.asyncio
async def test_game_run_updates_summary_and_quest_progress(client) -> None:
    auth = await login(client)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    for score in (4, 5, 6):
        run = await client.post("/v1/games/halva_snake/runs", json={"score": score}, headers=headers)
        assert run.status_code == 200

    summary = await client.get("/v1/games/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["total_runs"] == 3

    quests = await client.get("/v1/quests", headers=headers)
    orbit_quest = next(item for item in quests.json() if item["quest_id"] == "quest_orbit_001")
    assert orbit_quest["status"] == "completed"

    claim = await client.post(f"/v1/quests/{orbit_quest['quest_id']}/claim", headers=headers)
    assert claim.status_code == 200
    assert claim.json()["reward_type"] == "quest_booster"
