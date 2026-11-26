"""ASGI middleware: request size limit and security response headers."""
import json
import os


class BodySizeLimitMiddleware:
    """Reject oversized requests with 413 before the body is parsed (including chunked uploads)."""

    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        declared = dict(scope.get("headers") or []).get(b"content-length")
        if declared and declared.isdigit() and int(declared) > self.max_bytes:
            return await self._reject(send)

        # Read at most max_bytes, then replay what was read to the application.
        messages, size = [], 0
        while True:
            message = await receive()
            messages.append(message)
            if message["type"] != "http.request":
                break
            size += len(message.get("body", b""))
            if size > self.max_bytes:
                return await self._reject(send)
            if not message.get("more_body", False):
                break

        async def replay():
            return messages.pop(0) if messages else await receive()

        return await self.app(scope, replay, send)

    async def _reject(self, send):
        body = json.dumps({"status": "error", "detail": "Request is too large"}).encode()
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
        })
        await send({"type": "http.response.body", "body": body})


class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app
        self.headers = [
            (b"x-content-type-options", b"nosniff"),
            (b"strict-transport-security", b"max-age=63072000; includeSubDomains"),
            (b"referrer-policy", b"no-referrer"),
        ]
        # Hugging Face Spaces shows the app inside an iframe, so framing stays allowed there.
        if not os.getenv("SPACE_ID"):
            self.headers.append((b"x-frame-options", b"DENY"))

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                present = {name.lower() for name, _ in message.get("headers", [])}
                message["headers"] = list(message.get("headers", [])) + [h for h in self.headers if h[0] not in present]
            await send(message)

        return await self.app(scope, receive, send_with_headers)
