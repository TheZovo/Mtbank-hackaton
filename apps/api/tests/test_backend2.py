from __future__ import annotations

from datetime import date, timedelta

import pytest
from sqlalchemy import select

from common.enums import PlanetCode
from db.models import PlanetState, RewardLedger, User
from modules.admin.service import run_daily_degradation


async def login(client, phone: str = "+19990001001") -> dict:
    challenge = (await client.post("/v1/auth/request-otp", json={"phone": phone})).json()
    verify = await client.post(
        "/v1/auth/verify-otp",
        json={
            "challenge_id": challenge["challenge_id"],
            "phone": phone,
            "otp_code": challenge["dev_code"],
            "display_name": "Backend 2 Pilot",
        },
    )
    assert verify.status_code == 200
    return verify.json()


@pytest.mark.asyncio
async def test_planets_list_progress_and_focus(client) -> None:
    auth = await login(client)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    planets = await client.get("/v1/planets/list", headers=headers)
    assert planets.status_code == 200
    assert {item["id"] for item in planets.json()} == {
        PlanetCode.ORBIT_COMMERCE.value,
        PlanetCode.CREDIT_SHIELD.value,
        PlanetCode.SOCIAL_RING.value,
    }

    progress = await client.get(f"/v1/planets/{PlanetCode.ORBIT_COMMERCE.value}/progress", headers=headers)
    assert progress.status_code == 200
    payload = progress.json()
    assert payload["cashback_percent"] == 1.0
    assert payload["game"]["attempts_limit"] == 5

    focus = await client.patch(
        f"/v1/planets/{PlanetCode.CREDIT_SHIELD.value}/focus",
        json={"focus": True},
        headers=headers,
    )
    assert focus.status_code == 200
    assert focus.json() == {"planet_id": PlanetCode.CREDIT_SHIELD.value, "focus": True}


@pytest.mark.asyncio
async def test_game_run_awards_small_star_and_enforces_daily_limit(client) -> None:
    auth = await login(client, "+19990001002")
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    first = await client.post(
        "/v1/games/halva_snake/runs",
        json={"score": 8, "planet_id": PlanetCode.ORBIT_COMMERCE.value},
        headers=headers,
    )
    assert first.status_code == 200
    payload = first.json()
    assert payload["small_star_awarded"] is True
    assert payload["remaining_attempts_today"] == 4
    assert payload["planet_progress"]["constellation"]["small_stars_current"] == 1

    for _ in range(4):
        assert (
            await client.post(
                "/v1/games/halva_snake/runs",
                json={"score": 1, "planet_id": PlanetCode.ORBIT_COMMERCE.value},
                headers=headers,
            )
        ).status_code == 200

    blocked = await client.post(
        "/v1/games/halva_snake/runs",
        json={"score": 1, "planet_id": PlanetCode.ORBIT_COMMERCE.value},
        headers=headers,
    )
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_constellation_completion_increases_cashback_and_requests_promocode(client, test_app) -> None:
    auth = await login(client, "+19990001003")
    user_id = auth["user"]["user_id"]
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    async with test_app.state.db.session_factory() as session:
        state = await session.scalar(
            select(PlanetState).where(
                PlanetState.user_id == user_id,
                PlanetState.planet_code == PlanetCode.ORBIT_COMMERCE.value,
            )
        )
        state.current_big_star = 2
        state.small_stars_current = 3
        await session.commit()

    response = await client.post(
        "/v1/games/halva_snake/runs",
        json={"score": 12, "planet_id": PlanetCode.ORBIT_COMMERCE.value},
        headers=headers,
    )
    assert response.status_code == 200

    async with test_app.state.db.session_factory() as session:
        state = await session.scalar(
            select(PlanetState).where(
                PlanetState.user_id == user_id,
                PlanetState.planet_code == PlanetCode.ORBIT_COMMERCE.value,
            )
        )
        assert state.total_constellations_completed == 1
        assert state.cashback_percent == 1.5
        assert state.current_big_star == 0
        assert state.small_stars_current == 0
        promocode_request = await session.scalar(
            select(RewardLedger).where(
                RewardLedger.user_id == user_id,
                RewardLedger.reward_type == "be2_promocode_request",
            )
        )
        assert promocode_request is not None


@pytest.mark.asyncio
async def test_transaction_webhook_awards_star_by_mcc(client) -> None:
    auth = await login(client, "+19990001004")
    response = await client.post(
        "/v1/transactions/webhook",
        json={"user_id": auth["user"]["user_id"], "amount_rub": 20, "mcc_code": "5411"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "small_stars_awarded": 1,
        "planet_id": PlanetCode.ORBIT_COMMERCE.value,
    }


@pytest.mark.asyncio
async def test_planet_leaderboard_returns_top_and_current_rank(client) -> None:
    first = await login(client, "+19990001005")
    second = await login(client, "+19990001006")
    first_headers = {"Authorization": f"Bearer {first['access_token']}"}
    second_headers = {"Authorization": f"Bearer {second['access_token']}"}

    await client.post(
        "/v1/games/halva_snake/runs",
        json={"score": 5, "planet_id": PlanetCode.ORBIT_COMMERCE.value},
        headers=first_headers,
    )
    for _ in range(2):
        await client.post(
            "/v1/games/halva_snake/runs",
            json={"score": 5, "planet_id": PlanetCode.ORBIT_COMMERCE.value},
            headers=second_headers,
        )

    leaderboard = await client.get(
        f"/v1/leaderboard/planet/{PlanetCode.ORBIT_COMMERCE.value}?period=week",
        headers=first_headers,
    )
    assert leaderboard.status_code == 200
    payload = leaderboard.json()
    assert payload["top"][0]["user_id"] == second["user"]["user_id"]
    assert payload["current_user_rank"] == 2


@pytest.mark.asyncio
async def test_daily_degradation_decrements_stale_progress(test_app) -> None:
    async with test_app.state.db.session_factory() as session:
        user = User(phone="+19990001007", display_name="Stale Pilot")
        session.add(user)
        await session.flush()
        state = PlanetState(
            user_id=user.user_id,
            planet_code=PlanetCode.ORBIT_COMMERCE.value,
            cashback_percent=1.0,
            small_stars_current=1,
            last_game_win_date=date.today() - timedelta(days=6),
        )
        session.add(state)
        await session.commit()

    async with test_app.state.db.session_factory() as session:
        result = await run_daily_degradation(session)
        assert result == {"status": "ok", "degraded_planets": 1}

    async with test_app.state.db.session_factory() as session:
        state = await session.scalar(
            select(PlanetState).where(
                PlanetState.planet_code == PlanetCode.ORBIT_COMMERCE.value,
                PlanetState.user_id == user.user_id,
            )
        )
        assert state.small_stars_current == 0
