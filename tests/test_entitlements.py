"""Tests for the 10 Free Trips -> Paid Pro entitlements, quota enforcement, and RevenueCat webhook."""

import time

from conftest import USER_HEADERS, gemini_ok

ANON_HEADERS = {"Authorization": "Bearer anonymous-token"}
LINKED_HEADERS = {"Authorization": "Bearer verified-password-token"}
RC_HEADERS = {"Authorization": "Bearer test-rc-secret"}

GOOD_PLAN = (
    '{"trip":{"destination":"Kyoto","duration":"3 Days 2 Nights","budget":"Moderate",'
    '"hotels":[{"name":"Hotel Vista","address":"Kyoto","price":"$120","coordinates":{"lat":35.0,"lng":135.7},"rating":"4.5"}],'
    '"itinerary":[{"day":1,"theme":"Temples","activities":[{"time":"Morning","placeName":"Fushimi Inari",'
    '"details":"Shrine walk","tickets":"Free","coordinates":{"lat":34.96,"lng":135.77}}]}]}}'
)

BASE_PLAN_REQ = {"destination": "Kyoto", "days": 3, "budget": "Moderate"}


def _setup_ok_plan(providers):
    providers.handlers["gemini-primary"] = lambda: gemini_ok(GOOD_PLAN)


def test_sync_creates_guest_with_2_and_signed_in_with_10(client):
    r_anon = client.post("/api/users/sync", headers=ANON_HEADERS)
    assert r_anon.status_code == 200
    d_anon = r_anon.json()["data"]
    assert d_anon["is_anonymous"] is True
    assert d_anon["free_trips_limit"] == 2
    assert d_anon["remaining_free_trips"] == 2

    r_user = client.post("/api/users/sync", headers=USER_HEADERS)
    assert r_user.status_code == 200
    d_user = r_user.json()["data"]
    assert d_user["is_anonymous"] is False
    assert d_user["free_trips_limit"] == 10
    assert d_user["remaining_free_trips"] == 10


def test_guest_quota_enforced_at_2_and_linking_upgrades_to_10_preserving_usage(client, app, monkeypatch, providers):
    _setup_ok_plan(providers)
    # Use 2 guest trips (user-5)
    assert client.post("/plan", json=BASE_PLAN_REQ, headers=ANON_HEADERS).status_code == 200
    assert client.post("/plan", json={**BASE_PLAN_REQ, "destination": "Osaka"}, headers=ANON_HEADERS).status_code == 200

    # 3rd guest trip -> 402 QUOTA_EXCEEDED
    r3 = client.post("/plan", json={**BASE_PLAN_REQ, "destination": "Nara"}, headers=ANON_HEADERS)
    assert r3.status_code == 402
    body = r3.json()
    assert body["error_code"] == "QUOTA_EXCEEDED"
    assert body["trips_used"] == 2
    assert body["free_trips_limit"] == 2
    assert body["is_anonymous"] is True

    # Simulate user-5 linking their anonymous account to a signed-in Google account (same uid, non-anonymous provider)
    orig_verify = app.id_token.verify_firebase_token

    def verify_linked(token, req, audience):
        if token == "linked-user-5":
            return {
                "sub": "user-5",
                "iss": f"https://securetoken.google.com/{audience}",
                "email": "linked@example.com",
                "email_verified": True,
                "firebase": {"sign_in_provider": "google.com"},
            }
        return orig_verify(token, req, audience)

    monkeypatch.setattr(app.id_token, "verify_firebase_token", verify_linked)

    r_sync = client.post("/api/users/sync", headers={"Authorization": "Bearer linked-user-5"})
    assert r_sync.status_code == 200
    ent = r_sync.json()["data"]
    assert ent["is_anonymous"] is False
    assert ent["free_trips_limit"] == 10
    assert ent["trips_used"] == 2
    assert ent["remaining_free_trips"] == 8

    # Now 3rd trip succeeds!
    r3_after = client.post(
        "/plan",
        json={**BASE_PLAN_REQ, "destination": "Nara"},
        headers={"Authorization": "Bearer linked-user-5"},
    )
    assert r3_after.status_code == 200
    ent2 = client.get("/api/users/entitlements", headers={"Authorization": "Bearer linked-user-5"}).json()["data"]
    assert ent2["trips_used"] == 3
    assert ent2["remaining_free_trips"] == 7


def test_failed_generation_does_not_deduct_credit(client, providers):
    providers.handlers["gemini-primary"] = lambda: gemini_ok("not valid json at all")
    providers.handlers["gemini-backup"] = lambda: gemini_ok("still invalid")
    providers.handlers["api.deepseek.com"] = lambda: gemini_ok("still invalid")

    r = client.post("/plan", json=BASE_PLAN_REQ, headers=ANON_HEADERS)
    assert r.status_code == 502

    ent = client.get("/api/users/entitlements", headers=ANON_HEADERS).json()["data"]
    assert ent["trips_used"] == 0
    assert ent["remaining_free_trips"] == 2


def test_free_tier_caps_days_at_5_and_cities_at_2(client, providers):
    _setup_ok_plan(providers)
    r_short = client.post("/plan", json={**BASE_PLAN_REQ, "days": 2}, headers=USER_HEADERS)
    assert r_short.status_code == 402
    assert r_short.json()["error_code"] == "QUOTA_EXCEEDED"
    assert r_short.json()["reason"] == "free_days_limit"

    r_days = client.post("/plan", json={**BASE_PLAN_REQ, "days": 7}, headers=USER_HEADERS)
    assert r_days.status_code == 402
    assert r_days.json()["error_code"] == "QUOTA_EXCEEDED"
    assert r_days.json()["reason"] == "free_days_limit"

    r_cities = client.post("/plan", json={**BASE_PLAN_REQ, "cities_count": 3}, headers=USER_HEADERS)
    assert r_cities.status_code == 402
    assert r_cities.json()["reason"] == "free_cities_limit"


def test_minor_edits_allow_2_free_then_deduct_credit(client, providers):
    _setup_ok_plan(providers)
    # Initial trip (uses 1 of 2 guest credits)
    assert client.post("/plan", json=BASE_PLAN_REQ, headers=ANON_HEADERS).status_code == 200
    assert client.get("/api/users/entitlements", headers=ANON_HEADERS).json()["data"]["trips_used"] == 1

    # 2 minor edits on same trip_id -> 0 additional credits deducted
    for i in range(2):
        r = client.post(
            "/plan",
            json={**BASE_PLAN_REQ, "interests": f"edit {i}", "is_minor_edit": True, "trip_id": "trip_abc"},
            headers=ANON_HEADERS,
        )
        assert r.status_code == 200
    assert client.get("/api/users/entitlements", headers=ANON_HEADERS).json()["data"]["trips_used"] == 1

    # 3rd edit on same trip_id -> deducts 1 credit (now 2/2 used)
    r3 = client.post(
        "/plan",
        json={**BASE_PLAN_REQ, "interests": "edit 3", "is_minor_edit": True, "trip_id": "trip_abc"},
        headers=ANON_HEADERS,
    )
    assert r3.status_code == 200
    assert client.get("/api/users/entitlements", headers=ANON_HEADERS).json()["data"]["trips_used"] == 2


def test_revenuecat_webhook_auth_and_lifecycle(client, providers):
    _setup_ok_plan(providers)
    future_ms = int((time.time() + 86400 * 30) * 1000)

    # Unauthorized webhook rejected
    bad = client.post("/api/webhooks/revenuecat", json={"event": {"type": "INITIAL_PURCHASE", "app_user_id": "user-1"}})
    assert bad.status_code == 401

    # INITIAL_PURCHASE unlocks Pro (7+ days & multi-city allowed, unlimited trips)
    r_pro = client.post(
        "/api/webhooks/revenuecat",
        headers=RC_HEADERS,
        json={
            "event": {
                "id": "evt_1",
                "type": "INITIAL_PURCHASE",
                "app_user_id": "user-1",
                "product_id": "goguide_pro_yearly",
                "expiration_at_ms": future_ms,
            }
        },
    )
    assert r_pro.status_code == 200
    ent = client.get("/api/users/entitlements", headers=USER_HEADERS).json()["data"]
    assert ent["is_pro_active"] is True
    assert ent["plan_type"] == "pro_yearly"

    # 10-day, 3-city trip now succeeds and does not increment trips_used
    r_big = client.post("/plan", json={**BASE_PLAN_REQ, "days": 10, "cities_count": 3}, headers=USER_HEADERS)
    assert r_big.status_code == 200
    assert client.get("/api/users/entitlements", headers=USER_HEADERS).json()["data"]["trips_used"] == 0

    # EXPIRATION reverts to free
    r_exp = client.post(
        "/api/webhooks/revenuecat",
        headers=RC_HEADERS,
        json={"event": {"id": "evt_2", "type": "EXPIRATION", "app_user_id": "user-1"}},
    )
    assert r_exp.status_code == 200
    ent_after = client.get("/api/users/entitlements", headers=USER_HEADERS).json()["data"]
    assert ent_after["is_pro_active"] is False
    assert ent_after["plan_type"] == "free"

    # NON_RENEWING_PURCHASE adds 10 pack credits (idempotent on duplicate event id)
    pack_evt = {
        "event": {
            "id": "evt_pack_1",
            "type": "NON_RENEWING_PURCHASE",
            "app_user_id": "user-1",
            "product_id": "goguide_trip_pack_10",
        }
    }
    assert client.post("/api/webhooks/revenuecat", headers=RC_HEADERS, json=pack_evt).status_code == 200
    assert client.post("/api/webhooks/revenuecat", headers=RC_HEADERS, json=pack_evt).status_code == 200
    ent_pack = client.get("/api/users/entitlements", headers=USER_HEADERS).json()["data"]
    assert ent_pack["pack_credits"] == 10


def test_unverified_email_stays_at_2_trips_until_verified(client, app, monkeypatch, providers):
    _setup_ok_plan(providers)
    unverified_headers = {"Authorization": "Bearer unverified-password-token"}

    # Unverified email/password user stays at 2 free trips (cannot farm +8 with fake email)
    r_sync = client.post("/api/users/sync", headers=unverified_headers)
    assert r_sync.status_code == 200
    ent = r_sync.json()["data"]
    assert ent["is_anonymous"] is False
    assert ent["free_trips_limit"] == 2
    assert ent["verification_required"] is True

    # Uses 2 trips -> 3rd trip blocked with email_verification_required
    assert client.post("/plan", json=BASE_PLAN_REQ, headers=unverified_headers).status_code == 200
    assert client.post("/plan", json={**BASE_PLAN_REQ, "destination": "Osaka"}, headers=unverified_headers).status_code == 200
    r3 = client.post("/plan", json={**BASE_PLAN_REQ, "destination": "Nara"}, headers=unverified_headers)
    assert r3.status_code == 402
    assert r3.json()["reason"] == "email_verification_required"

    # Once the same uid verifies their real inbox, sync upgrades limit 2 -> 10 preserving trips_used=2
    orig_verify = app.id_token.verify_firebase_token

    def verify_now_confirmed(token, req, audience):
        if token == "user-3-verified":
            return {
                "sub": "user-3",
                "iss": f"https://securetoken.google.com/{audience}",
                "email": "real@gmail.com",
                "email_verified": True,
                "firebase": {"sign_in_provider": "password"},
            }
        return orig_verify(token, req, audience)

    monkeypatch.setattr(app.id_token, "verify_firebase_token", verify_now_confirmed)
    r_after = client.post("/api/users/sync", headers={"Authorization": "Bearer user-3-verified"})
    assert r_after.status_code == 200
    ent_after = r_after.json()["data"]
    assert ent_after["free_trips_limit"] == 10
    assert ent_after["trips_used"] == 2
    assert ent_after["remaining_free_trips"] == 8
    assert ent_after["verification_required"] is False


def test_disposable_email_domain_does_not_unlock_10_trips(client, app, monkeypatch):
    orig_verify = app.id_token.verify_firebase_token

    def verify_disposable(token, req, audience):
        if token == "disposable-token":
            return {
                "sub": "user-disp",
                "iss": f"https://securetoken.google.com/{audience}",
                "email": "burner@mailinator.com",
                "email_verified": True,
                "firebase": {"sign_in_provider": "password"},
            }
        return orig_verify(token, req, audience)

    monkeypatch.setattr(app.id_token, "verify_firebase_token", verify_disposable)
    r = client.post("/api/users/sync", headers={"Authorization": "Bearer disposable-token"})
    assert r.status_code == 200
    ent = r.json()["data"]
    assert ent["free_trips_limit"] == 2
    assert ent["verification_required"] is True


