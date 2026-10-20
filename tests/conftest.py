import os
import sys

import pytest
import requests

# Fixed fake config. Set before app.py is imported so a local .env cannot override it.
os.environ["API_KEY"] = "test-api-key"
os.environ["GEMINI_API_KEY"] = "test-gemini-key"
os.environ["DEEPSEEK_API_KEY"] = "test-deepseek-key"
os.environ["FIREBASE_PROJECT_ID"] = "test-project"
os.environ["GEMINI_MODELS"] = "gemini-primary,gemini-backup"
os.environ["RATE_LIMIT_PER_HOUR"] = "30"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
    monkeypatch.setattr(app_module, "RATE_LIMIT_PER_HOUR", 30)
    app_module._request_log.clear()
    yield
    app_module._request_log.clear()


@pytest.fixture
def client(providers):
    return TestClient(app_module.app, raise_server_exceptions=False)
