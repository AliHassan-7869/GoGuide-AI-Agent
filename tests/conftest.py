import os
import sys

import pytest
import requests

# Fixed fake config. Set before app.py is imported so a local .env cannot override it
# (app.py calls load_dotenv(), which never overwrites a variable that is already set, even to "").
# EVERY setting the backend reads is pinned here, so tests behave the same on a developer machine
# with real keys in .env as they do in CI with no .env at all.
_TEST_ENV = {
    "API_KEY": "test-api-key",
    "GEMINI_API_KEY": "test-gemini-key",
    "DEEPSEEK_API_KEY": "test-deepseek-key",
    "NVIDIA_API_KEY": "",          # not configured; tests that need it enable it explicitly
    "JEV_API_KEY": "",             # orchestrator must use its offline evaluator, never the network
    "JEV_API_BASE": "http://jev.invalid",
    "FIREBASE_PROJECT_ID": "test-project",
    "GEMINI_MODELS": "gemini-primary,gemini-backup",
    "DEEPSEEK_MODEL": "deepseek-chat",
    "NVIDIA_MODEL": "nvidia/test-model",
    "RATE_LIMIT_PER_HOUR": "30",
    "IP_RATE_LIMIT_PER_HOUR": "1000",
    "MAX_DAILY_AI_CALLS": "500",
    "ALLOW_API_KEY_AUTH": "false",
    "REQUIRE_EMAIL_VERIFICATION": "false",
    "ALLOWED_ORIGINS": "",
    "SENTRY_DSN": "",
    "SENTRY_ENVIRONMENT": "test",
    "SENTRY_TRACES_SAMPLE_RATE": "0",
    "ENVIRONMENT": "test",
    "ENTITLEMENTS_DB_PATH": ":memory:",
    "REVENUECAT_WEBHOOK_SECRET": "test-rc-secret",
}
os.environ.update(_TEST_ENV)
# Make sure the "keep-alive" thread (only started on Render) can never start during tests.
for _var in ("RENDER", "PORT", "RENDER_EXTERNAL_URL", "RENDER_GIT_COMMIT"):
    os.environ.pop(_var, None)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Tests must never report to the real Sentry project (app.py has a hard-coded DSN fallback).
try:
    import sentry_sdk

    sentry_sdk.init = lambda *args, **kwargs: None
except ImportError:
    pass

import app as app_module  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

API_HEADERS = {"X-API-Key": "test-api-key"}
USER_HEADERS = {"Authorization": "Bearer good-token"}


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"{self.status_code} Error")


def gemini_ok(text):
    return FakeResponse(200, {"candidates": [{"content": {"parts": [{"text": text}]}}]})


def deepseek_ok(text):
    return FakeResponse(200, {"choices": [{"message": {"content": text}}]})


class FakeProviders:
    """Stands in for requests.post. Routes by URL and records every call."""

    def __init__(self):
        self.calls = []
        self.handlers = {
            "gemini-primary": lambda: gemini_ok('{"ok": true}'),
            "gemini-backup": lambda: gemini_ok('{"ok": "backup"}'),
            "api.deepseek.com": lambda: deepseek_ok('{"ok": "deepseek"}'),
        }

    def __call__(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        for key, handler in self.handlers.items():
            if key in url:
                result = handler()
                if isinstance(result, Exception):
                    raise result
                return result
        raise AssertionError(f"Unexpected outgoing request: {url}")

    def urls(self):
        return [c["url"] for c in self.calls]


def fake_verify_firebase_token(token, request, audience):
    if token == "good-token":
        return {"sub": "user-1", "iss": f"https://securetoken.google.com/{audience}", "aud": audience}
    if token == "other-user-token":
        return {"sub": "user-2", "iss": f"https://securetoken.google.com/{audience}", "aud": audience}
    if token == "unverified-password-token":
        return {"sub": "user-3", "iss": f"https://securetoken.google.com/{audience}", "email": "a@b.co",
                "email_verified": False, "firebase": {"sign_in_provider": "password"}}
    if token == "verified-password-token":
        return {"sub": "user-4", "iss": f"https://securetoken.google.com/{audience}", "email": "a@b.co",
                "email_verified": True, "firebase": {"sign_in_provider": "password"}}
    if token == "anonymous-token":
        return {"sub": "user-5", "iss": f"https://securetoken.google.com/{audience}",
                "firebase": {"sign_in_provider": "anonymous"}}
    if token == "wrong-issuer-token":
        return {"sub": "user-1", "iss": "https://securetoken.google.com/someone-else"}
    if token == "network-down-token":
        raise requests.exceptions.ConnectionError("cannot fetch certs")
    raise ValueError("invalid token")


@pytest.fixture
def app():
    return app_module


@pytest.fixture
def providers(monkeypatch):
    fake = FakeProviders()
    monkeypatch.setattr(app_module.requests, "post", fake)
    return fake


@pytest.fixture(autouse=True)
def isolate(monkeypatch):
    monkeypatch.setattr(app_module.id_token, "verify_firebase_token", fake_verify_firebase_token)
    monkeypatch.setattr(app_module, "API_KEY", "test-api-key")
    monkeypatch.setattr(app_module, "GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr(app_module, "DEEPSEEK_API_KEY", "test-deepseek-key")
    monkeypatch.setattr(app_module, "NVIDIA_API_KEY", None)
    monkeypatch.setattr(app_module, "RATE_LIMIT_PER_HOUR", 30)
    monkeypatch.setattr(app_module, "IP_RATE_LIMIT_PER_HOUR", 1000)
    monkeypatch.setattr(app_module, "ALLOW_API_KEY_AUTH", True)
    monkeypatch.setattr(app_module, "REVENUECAT_WEBHOOK_SECRET", "test-rc-secret")
    monkeypatch.setattr(app_module, "get_curated_plan", lambda *a, **kw: None)
    app_module.entitlements_store.reset_for_tests()
    app_module._request_log.clear()
    app_module._PLAN_CACHE.clear()
    yield
    app_module._request_log.clear()
    app_module._PLAN_CACHE.clear()


@pytest.fixture
def client(providers):
    return TestClient(app_module.app, raise_server_exceptions=False)
