from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_user_nickname_friendship_and_payment_request_flow(client) -> None:
    create_alice = await client.post("/v1/users", json={"nickname": "alice"})
    assert create_alice.status_code == 200
    alice = create_alice.json()
    assert alice["nickname"] == "alice"
    assert alice["id"]

    duplicate_alice = await client.post("/v1/users", json={"nickname": "alice"})
    assert duplicate_alice.status_code == 200
    assert duplicate_alice.json()["id"] == alice["id"]

    create_bob = await client.post("/v1/users", json={"nickname": "bob"})
    assert create_bob.status_code == 200
    bob = create_bob.json()
    assert bob["nickname"] == "bob"
    assert bob["id"] != alice["id"]

    find_bob = await client.get("/v1/users", params={"nickname": "bob"})
    assert find_bob.status_code == 200
    assert find_bob.json() == bob

    add_friend = await client.post(
        "/v1/friends",
        json={
            "user_id": alice["id"],
            "friend_id": bob["id"],
        },
    )
    assert add_friend.status_code == 200
    assert add_friend.json() == {"success": True}

    alice_friends = await client.get(f"/v1/friends/{alice['id']}")
    assert alice_friends.status_code == 200
    assert alice_friends.json() == [
        {
            "id": bob["id"],
            "nickname": "bob",
            "games_played": 0,
        }
    ]

    first_play = await client.post(
        "/v1/play-together",
        json={"user_id": alice["id"], "friend_id": bob["id"]},
    )
    assert first_play.status_code == 200
    assert first_play.json() == {"gift": False}

    second_play = await client.post(
        "/v1/play-together",
        json={"user_id": alice["id"], "friend_id": bob["id"]},
    )
    assert second_play.status_code == 200
    assert second_play.json() == {"gift": False}

    third_play = await client.post(
        "/v1/play-together",
        json={"user_id": alice["id"], "friend_id": bob["id"]},
    )
    assert third_play.status_code == 200
    third_payload = third_play.json()
    assert third_payload["gift"] is True
    assert isinstance(third_payload["promocode"], str)
    assert len(third_payload["promocode"]) >= 8

    alice_friends_after_games = await client.get(f"/v1/friends/{alice['id']}")
    assert alice_friends_after_games.status_code == 200
    assert alice_friends_after_games.json() == [
        {
            "id": bob["id"],
            "nickname": "bob",
            "games_played": 3,
        }
    ]

    create_payment_request = await client.post(
        "/v1/payment-requests",
        json={
            "amount": 42.5,
            "description": "Planetary coffee",
            "user_id": alice["id"],
        },
    )
    assert create_payment_request.status_code == 200
    payment_request = create_payment_request.json()
    assert payment_request["id"]

    get_payment_request = await client.get(f"/v1/payment-requests/{payment_request['id']}")
    assert get_payment_request.status_code == 200
    assert get_payment_request.json() == {
        "id": payment_request["id"],
        "amount": 42.5,
        "description": "Planetary coffee",
        "status": "pending",
    }

    pay_payment_request = await client.post(f"/v1/payment-requests/{payment_request['id']}/pay")
    assert pay_payment_request.status_code == 200
    assert pay_payment_request.json() == {"success": True}

    get_paid_request = await client.get(f"/v1/payment-requests/{payment_request['id']}")
    assert get_paid_request.status_code == 200
    assert get_paid_request.json()["status"] == "paid"
