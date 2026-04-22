from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from mock_server import DEFAULT_ACCESS_TOKEN, create_app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(create_app())


def auth_headers(token: str = DEFAULT_ACCESS_TOKEN) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_protected_endpoints_require_valid_token(client: TestClient) -> None:
    no_token_response = client.get("/v1/me")
    assert no_token_response.status_code == 401

    invalid_token_response = client.get("/v1/me", headers=auth_headers("invalid-token"))
    assert invalid_token_response.status_code == 401

    valid_token_response = client.get("/v1/me", headers=auth_headers())
    assert valid_token_response.status_code == 200


def test_game_attempt_limit_is_enforced(client: TestClient) -> None:
    for attempt in range(5):
        response = client.post(
            "/v1/games/halva_snake/runs",
            headers=auth_headers(),
            json={"score": 100 + attempt, "planet_id": "apteki"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["small_star_awarded"] is True
        assert payload["remaining_attempts_today"] == 4 - attempt
        assert payload["planet_progress"]["period_small_stars"] == attempt + 1
        assert payload["planet_progress"]["game"]["daily_attempts_used"] == attempt + 1

    exhausted_response = client.post(
        "/v1/games/halva_snake/runs",
        headers=auth_headers(),
        json={"score": 999, "planet_id": "apteki"},
    )
    assert exhausted_response.status_code == 200
    assert exhausted_response.json()["small_star_awarded"] is False
    assert exhausted_response.json()["remaining_attempts_today"] == 0


def test_admin_end_period_resets_period_stars_and_generates_promocodes(client: TestClient) -> None:
    client.post(
        "/v1/games/halva_snake/runs",
        headers=auth_headers(),
        json={"score": 120, "planet_id": "apteki"},
    )

    response = client.post("/v1/admin/end_period")
    assert response.status_code == 200
    assert response.json()["promocodes_generated"] == 10

    progress_response = client.get("/v1/planets/apteki/progress", headers=auth_headers())
    assert progress_response.status_code == 200
    assert progress_response.json()["period_small_stars"] == 0

    promocodes_response = client.get("/v1/promocodes", headers=auth_headers())
    assert promocodes_response.status_code == 200
    assert len(promocodes_response.json()["promocodes"]) == 10


def test_admin_reset_returns_state_to_defaults(client: TestClient) -> None:
    client.post(
        "/v1/games/halva_snake/runs",
        headers=auth_headers(),
        json={"score": 140, "planet_id": "apteki"},
    )
    client.post("/v1/referrals", headers=auth_headers(), json={"phone": "+79991234567"})
    client.post("/v1/admin/end_period")

    reset_response = client.post("/v1/admin/reset")
    assert reset_response.status_code == 200
    assert reset_response.json()["status"] == "reset"

    me_response = client.get("/v1/me", headers=auth_headers())
    assert me_response.status_code == 200
    assert me_response.json()["daily_game_attempts_used"] == 0

    progress_response = client.get("/v1/planets/apteki/progress", headers=auth_headers())
    assert progress_response.status_code == 200
    progress_payload = progress_response.json()
    assert progress_payload["period_small_stars"] == 0
    assert progress_payload["constellation"]["small_stars_current"] == 0

    referrals_response = client.get("/v1/referrals", headers=auth_headers())
    assert referrals_response.status_code == 200
    assert referrals_response.json()["referrals"] == []

    promocodes_response = client.get("/v1/promocodes", headers=auth_headers())
    assert promocodes_response.status_code == 200
    assert promocodes_response.json()["promocodes"] == []
