import json

import pytest
import requests

from conftest import API_HEADERS, USER_HEADERS, deepseek_ok, gemini_ok

PLAN_BODY = {"destination": "Lahore", "days": 3, "budget": "Cheap"}
CHAT_BODY = {"message": "Lahore mein kya khaun?"}


# -------------------- Basics --------------------
def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


# -------------------- Auth --------------------
@pytest.mark.parametrize("path,body", [("/plan", PLAN_BODY), ("/chat", CHAT_BODY), ("/generate", {"prompt": "hi"})])
def test_requires_auth(client, providers, path, body):
    assert client.post(path, json=body).status_code == 401
    assert providers.calls == []


@pytest.mark.parametrize("key", ["", "wrong", "goguide-secret"])
def test_rejects_bad_api_key(client, key):
    assert client.post("/plan", json=PLAN_BODY, headers={"X-API-Key": key}).status_code == 401


def test_accepts_api_key(client):
    assert client.post("/plan", json=PLAN_BODY, headers=API_HEADERS).status_code == 200


def test_accepts_firebase_user(client):
    assert client.post("/chat", json=CHAT_BODY, headers=USER_HEADERS).status_code == 200


@pytest.mark.parametrize("token", ["garbage", "wrong-issuer-token"])
def test_rejects_bad_firebase_token(client, token):
    res = client.post("/chat", json=CHAT_BODY, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_firebase_outage_is_503(client):
    res = client.post("/chat", json=CHAT_BODY, headers={"Authorization": "Bearer network-down-token"})
    assert res.status_code == 503


def test_missing_server_api_key_blocks_everyone(client, app, monkeypatch):
    monkeypatch.setattr(app, "API_KEY", None)
    res = client.post("/plan", json=PLAN_BODY, headers={"X-API-Key": "anything"})
    assert res.status_code == 503


# -------------------- Validation --------------------
@pytest.mark.parametrize("override", [{"days": 0}, {"days": 31}, {"destination": "L"}, {"budget": "x" * 51}])
def test_plan_validation(client, providers, override):
    res = client.post("/plan", json={**PLAN_BODY, **override}, headers=API_HEADERS)
    assert res.status_code == 422
    assert providers.calls == []


@pytest.mark.parametrize("body", [
    {"message": ""},
    {"message": "x" * 2001},
    {"message": "hi", "history": [{"sender": "user", "text": "a"}] * 21},
])
def test_chat_validation(client, body):
    assert client.post("/chat", json=body, headers=USER_HEADERS).status_code == 422


# -------------------- Rate limit --------------------
def test_rate_limit_per_user(client, app, monkeypatch):
    monkeypatch.setattr(app, "RATE_LIMIT_PER_HOUR", 3)
    codes = [client.post("/chat", json=CHAT_BODY, headers=USER_HEADERS).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]

    # A different user has their own bucket
    other = client.post("/chat", json=CHAT_BODY, headers={"Authorization": "Bearer other-user-token"})
    assert other.status_code == 200


# -------------------- Providers and fallback --------------------
def test_gemini_key_sent_in_header_not_url(client, providers):
    client.post("/plan", json=PLAN_BODY, headers=API_HEADERS)
    call = providers.calls[0]
    assert "key=" not in call["url"]
    assert call["headers"]["x-goog-api-key"] == "test-gemini-key"


def test_falls_back_to_backup_gemini_model(client, providers):
    providers.handlers["gemini-primary"] = lambda: requests.exceptions.ReadTimeout("slow")
    res = client.post("/generate", json={"prompt": "hi"}, headers=API_HEADERS)
    assert res.json()["data"]["text"] == '{"ok": "backup"}'
    assert [u.split("/models/")[1].split(":")[0] for u in providers.urls()] == ["gemini-primary", "gemini-backup"]


def test_empty_gemini_reply_tries_next_model(client, providers):
    providers.handlers["gemini-primary"] = lambda: gemini_ok("")
    res = client.post("/generate", json={"prompt": "hi"}, headers=API_HEADERS)
    assert res.json()["data"]["text"] == '{"ok": "backup"}'


def test_falls_back_to_deepseek(client, providers):
    providers.handlers["gemini-primary"] = lambda: requests.exceptions.HTTPError("503")
    providers.handlers["gemini-backup"] = lambda: requests.exceptions.HTTPError("429")
    res = client.post("/generate", json={"prompt": "hi"}, headers=API_HEADERS)
    assert res.json()["data"]["text"] == '{"ok": "deepseek"}'


def test_all_providers_down_returns_generic_error(client, providers):
    for key in providers.handlers:
        providers.handlers[key] = lambda: requests.exceptions.HTTPError("500 for url https://x?key=SECRET")
    res = client.post("/plan", json=PLAN_BODY, headers=API_HEADERS)
    assert res.status_code == 502
    assert res.json() == {"detail": "AI service error, please try again"}
    assert "SECRET" not in res.text


def test_no_providers_configured(client, app, monkeypatch, providers):
    monkeypatch.setattr(app, "GEMINI_API_KEY", None)
    monkeypatch.setattr(app, "DEEPSEEK_API_KEY", None)
    res = client.post("/chat", json=CHAT_BODY, headers=USER_HEADERS)
    assert res.status_code == 503
    assert providers.calls == []


def test_deepseek_only_when_gemini_not_configured(client, app, monkeypatch, providers):
    monkeypatch.setattr(app, "GEMINI_API_KEY", None)
    providers.handlers["api.deepseek.com"] = lambda: deepseek_ok("<think>hmm</think>Hello")
    res = client.post("/chat", json=CHAT_BODY, headers=USER_HEADERS)
    assert res.json()["data"]["reply"] == "Hello"
    assert all("deepseek" in u for u in providers.urls())


# -------------------- /plan --------------------
def test_plan_returns_parsed_json(client, providers):
    plan = {"trip": {"destination": "Lahore", "itinerary": [{"day": 1}]}}
    providers.handlers["gemini-primary"] = lambda: gemini_ok("```json\n" + json.dumps(plan) + "\n```")
    res = client.post("/plan", json=PLAN_BODY, headers=API_HEADERS)
    data = res.json()["data"]
    assert data["plan"] == plan
    assert (data["destination"], data["days"], data["budget"]) == ("Lahore", 3, "Cheap")


def test_plan_keeps_text_when_not_json(client, providers):
    providers.handlers["gemini-primary"] = lambda: gemini_ok("not json")
    res = client.post("/plan", json=PLAN_BODY, headers=API_HEADERS)
    assert res.json()["data"]["plan"] == "not json"


# -------------------- /chat --------------------
def test_chat_sends_trip_context_and_trimmed_history(client, providers):
    history = [{"sender": "ai", "text": "Welcome"}]
    history += [{"sender": "user" if i % 2 == 0 else "ai", "text": f"m{i}"} for i in range(10)]
    body = {"message": "Next?", "history": history, "trip": {"destination": "Hunza", "days": 5, "budget": "Luxury"}}

    client.post("/chat", json=body, headers=USER_HEADERS)
    payload = providers.calls[0]["json"]
    contents = payload["contents"]

    assert contents[0]["role"] == "user"
    assert contents[-1] == {"role": "user", "parts": [{"text": "Next?"}]}
    assert len(contents) <= 7
    system_text = payload["systemInstruction"]["parts"][0]["text"]
    assert "Hunza" in system_text and "5 days" in system_text and "Luxury" in system_text


def test_chat_without_trip(client, providers):
    client.post("/chat", json=CHAT_BODY, headers=USER_HEADERS)
    system_text = providers.calls[0]["json"]["systemInstruction"]["parts"][0]["text"]
    assert "No active trip selected yet." in system_text


# -------------------- /generate --------------------
@pytest.mark.parametrize("json_output,expect_mime", [(True, True), (False, False)])
def test_generate_json_mode(client, providers, json_output, expect_mime):
    client.post("/generate", json={"prompt": "hi", "json_output": json_output}, headers=API_HEADERS)
    config = providers.calls[0]["json"]["generationConfig"]
    assert ("responseMimeType" in config) is expect_mime


# -------------------- Errors --------------------
def test_unexpected_error_is_hidden(client, providers):
    providers.handlers["gemini-primary"] = lambda: (_ for _ in ()).throw(RuntimeError("internal secret detail"))
    res = client.post("/generate", json={"prompt": "hi"}, headers=API_HEADERS)
    assert res.status_code == 500
    assert "internal secret detail" not in res.text
