import json
import logging
import os
import re
import secrets
import threading
import time
from collections import defaultdict, deque
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel, Field
import requests

logger = logging.getLogger("goguide")

app = FastAPI(title="GoGuide AI API")

# -------------------- CORS --------------------
# Comma-separated list, e.g. "https://goguide.app,https://admin.goguide.app"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "HEAD"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# -------------------- CONFIG --------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
API_KEY = os.getenv("API_KEY")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "ai-travel-agent-e36a2")
RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", "30"))

# Tried in order. If one is down or overloaded, the next one is used.
GEMINI_MODELS = [m.strip() for m in os.getenv("GEMINI_MODELS", "gemini-3.8-flash,gemini-2.5-flash").split(",") if m.strip()]
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_TIMEOUT = (5, 40)  # (connect, read) seconds per model
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
AI_ERROR = "AI service error, please try again"

_google_request = google_requests.Request()

# -------------------- AUTH --------------------
def verify_api_key(x_api_key: str | None):
    if not API_KEY:
        logger.error("API_KEY is not configured on server")
        raise HTTPException(status_code=503, detail="Service not configured")
    if not x_api_key or not secrets.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Unauthorized")


def verify_firebase_user(token: str) -> str:
    """Verify a Firebase ID token sent by the mobile app and return the user's uid."""
    try:
        claims = id_token.verify_firebase_token(token, _google_request, audience=FIREBASE_PROJECT_ID)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired login, please sign in again")
    except Exception as e:
        logger.error("Firebase token verification failed: %s", e)
        raise HTTPException(status_code=503, detail="Auth service unavailable, please try again")

    if not claims or claims.get("iss") != f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}" or not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired login, please sign in again")
    return claims["sub"]


# -------------------- RATE LIMIT --------------------
# In-memory, per process. Good for a single Render instance.
_request_log: dict[str, deque] = defaultdict(deque)
_rate_lock = threading.Lock()


def check_rate_limit(client_id: str):
    now = time.monotonic()
    with _rate_lock:
        timestamps = _request_log[client_id]
        while timestamps and now - timestamps[0] > 3600:
            timestamps.popleft()
        if len(timestamps) >= RATE_LIMIT_PER_HOUR:
            raise HTTPException(status_code=429, detail="Too many requests, please try again later")
        timestamps.append(now)


def require_client(
    request: Request,
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> str:
    """Accept a Firebase login (Authorization: Bearer <token>) or the server API key."""
    if authorization and authorization.startswith("Bearer "):
        client_id = f"user:{verify_firebase_user(authorization[len('Bearer '):].strip())}"
    elif x_api_key is not None:
        verify_api_key(x_api_key)
        client_id = f"key:{request.client.host if request.client else 'unknown'}"
    else:
        raise HTTPException(status_code=401, detail="Unauthorized")

    check_rate_limit(client_id)
    return client_id


# -------------------- AI PROVIDERS --------------------
def call_gemini(contents: list, generation_config: dict, system_instruction: str | None = None) -> str:
    payload = {"contents": contents, "generationConfig": generation_config}
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    last_error = None
    for model in GEMINI_MODELS:
        try:
            response = requests.post(
                GEMINI_URL.format(model=model),
                headers={"x-goog-api-key": GEMINI_API_KEY},
                json=payload,
                timeout=GEMINI_TIMEOUT
            )
            response.raise_for_status()
            res_json = response.json()
            text = res_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if text:
                return text
            logger.error("Gemini %s returned an empty response", model)
        except requests.exceptions.RequestException as e:
            logger.error("Gemini %s error: %s", model, e)
            last_error = e

    if last_error:
        raise last_error
    return ""


def call_deepseek(messages: list, temperature: float, max_tokens: int, json_mode: bool = False) -> str:
    payload = {
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    response = requests.post(
        DEEPSEEK_URL,
        headers={
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=60
    )
    response.raise_for_status()
    result_data = response.json()
    content = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return re.sub(r"<think>[\s\S]*?</think>", "", content).strip()


def generate_with_fallback(gemini_call, deepseek_call) -> str:
    """Try Gemini first, then DeepSeek. Raise a generic error if both fail."""
    if not GEMINI_API_KEY and not DEEPSEEK_API_KEY:
        logger.error("Neither GEMINI_API_KEY nor DEEPSEEK_API_KEY is configured on server")
        raise HTTPException(status_code=503, detail="Service not configured")

    if GEMINI_API_KEY:
        try:
            text = gemini_call()
            if text:
                return text
            logger.error("Gemini returned an empty response")
        except requests.exceptions.RequestException as e:
            logger.error("Gemini API error: %s", e)

    if DEEPSEEK_API_KEY:
        try:
            text = deepseek_call()
            if text:
                return text
            logger.error("DeepSeek returned an empty response")
        except requests.exceptions.RequestException as e:
            logger.error("DeepSeek API error: %s", e)

    raise HTTPException(status_code=502, detail=AI_ERROR)


# -------------------- REQUEST MODELS --------------------
class TravelRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=100)
    days: int = Field(ge=1, le=30)
    budget: str = Field(min_length=1, max_length=50)
    interests: str | None = Field(default=None, max_length=500)
    categories: str | None = Field(default=None, max_length=300)


class ChatMessage(BaseModel):
    sender: str = Field(max_length=20)
    text: str = Field(max_length=4000)


class TripContext(BaseModel):
    destination: str | None = Field(default=None, max_length=100)
    days: int | None = Field(default=None, ge=1, le=365)
    budget: str | None = Field(default=None, max_length=50)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    trip: TripContext | None = None


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    json_output: bool = True

# -------------------- ROOT & HEALTH CHECK --------------------
@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"status": "ok"}


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok"}

# -------------------- ITINERARY CACHE --------------------
# In-memory TTL cache for generated travel plans (24-hour TTL)
_PLAN_CACHE: dict[str, dict] = {}
_CACHE_TTL_SECONDS = 86400

# -------------------- POST /plan (main functionality) --------------------
@app.post("/plan")
def generate_plan(request: TravelRequest, client_id: str = Depends(require_client)):
    # Check cache first for 200ms instantaneous response
    cache_key = f"{request.destination.strip().lower()}_{request.days}_{request.budget.strip().lower()}_{request.categories or ''}_{request.interests or ''}"
    now = time.time()
    if cache_key in _PLAN_CACHE:
        entry = _PLAN_CACHE[cache_key]
        if now - entry.get("timestamp", 0) < _CACHE_TTL_SECONDS:
            logger.info("Serving cached itinerary for %s (%s days)", request.destination, request.days)
            return entry["response"]

    extra_instructions = []
    if request.categories:
        extra_instructions.append(f"Focus heavily on these travel themes/categories: {request.categories}.")
    if request.interests:
        extra_instructions.append(f"Include these specific chosen places/activities in the itinerary: {request.interests}.")
    focus_str = (" " + " ".join(extra_instructions)) if extra_instructions else ""

    prompt = f"""Plan a {request.days}-day trip to {request.destination} with a {request.budget} budget.{focus_str} Return ONLY valid JSON with this structure:
{{
  "trip": {{
    "destination": "{request.destination}",
    "duration": "{request.days} Days {max(1, request.days - 1)} Nights",
    "budget": "{request.budget}",
    "hotels": [
      {{
        "name": "Hotel Name",
        "address": "Hotel Address",
        "price": "$XXX per night",
        "coordinates": {{"lat": 0.0, "lng": 0.0}},
        "rating": "4.5"
      }}
    ],
    "itinerary": [
      {{
        "day": 1,
        "theme": "Day Theme",
        "activities": [
          {{
            "time": "Morning / Afternoon / Evening",
            "placeName": "Place or Attraction Name",
            "details": "Description of activity",
            "tickets": "Ticket cost or Free",
            "coordinates": {{"lat": 0.0, "lng": 0.0}}
          }}
        ]
      }}
    ]
  }}
}}"""

    raw_content = generate_with_fallback(
        lambda: call_gemini(
            [{"parts": [{"text": prompt}]}],
            {"temperature": 0.7, "responseMimeType": "application/json"},
        ),
        lambda: call_deepseek(
            [
                {
                    "role": "system",
                    "content": "You are an expert travel planning assistant. Always output your response as valid JSON only, without any markdown formatting, code block fences, or extra text."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4096,
            json_mode=True,
        ),
    )

    # Clean content
    clean_content = re.sub(r"<think>[\s\S]*?</think>", "", raw_content).strip()
    clean_content = re.sub(r"^```(?:json)?", "", clean_content, flags=re.MULTILINE)
    clean_content = re.sub(r"```$", "", clean_content, flags=re.MULTILINE).strip()

    try:
        plan_data = json.loads(clean_content)
    except json.JSONDecodeError:
        plan_data = clean_content

    response_payload = {
        "status": "success",
        "data": {
            "destination": request.destination,
            "days": request.days,
            "budget": request.budget,
            "plan": plan_data
        }
    }

    _PLAN_CACHE[cache_key] = {
        "timestamp": now,
        "response": response_payload
    }

    return response_payload

# -------------------- GET /plan (browser-friendly) --------------------
@app.get("/plan")
def generate_plan_get(x_api_key: str | None = Header(default=None)):
    verify_api_key(x_api_key)

    return {
        "status": "success",
        "message": "Please send a POST request to /plan with JSON payload to generate the travel plan."
    }

# -------------------- POST /chat (AI Travel Copilot) --------------------
@app.post("/chat")
def chat(request: ChatRequest, client_id: str = Depends(require_client)):
    trip = request.trip
    trip_context = (
        f"Current Planned Trip: Destination: {trip.destination or 'Not specified'}, "
        f"Duration: {trip.days or 'N/A'} days, Budget: {trip.budget or 'Flexible'}."
        if trip else "No active trip selected yet."
    )

    system_instruction = f"""You are "GoGuide AI Copilot", an elite, world-class AI travel guide and trip concierge.
{trip_context}
Your style:
- Friendly, inspiring, crisp, and high-energy with relevant emojis (✈️, 🍜, 📍, 💡, 💰, 🏨).
- Use clear bullet points and bold highlights for readability.
- When asked about places or food, include names, vibes, and price estimates.
- Keep responses compact, punchy, and easy to read on mobile screens (avoid huge text walls).
- If the user writes in Urdu or Roman Urdu, reply warmly in Roman Urdu/English mix!"""

    history = request.history[-6:]
    # Gemini expects the conversation to start with a user turn
    while history and history[0].sender != "user":
        history = history[1:]

    gemini_contents = [
        {"role": "user" if msg.sender == "user" else "model", "parts": [{"text": msg.text}]}
        for msg in history
    ]
    gemini_contents.append({"role": "user", "parts": [{"text": request.message}]})

    deepseek_messages = [{"role": "system", "content": system_instruction}]
    deepseek_messages += [
        {"role": "user" if msg.sender == "user" else "assistant", "content": msg.text}
        for msg in history
    ]
    deepseek_messages.append({"role": "user", "content": request.message})

    reply = generate_with_fallback(
        lambda: call_gemini(
            gemini_contents,
            {"temperature": 0.8, "topP": 0.95, "maxOutputTokens": 1024},
            system_instruction=system_instruction,
        ),
        lambda: call_deepseek(deepseek_messages, temperature=0.8, max_tokens=1024),
    )

    return {"status": "success", "data": {"reply": reply.strip()}}

# -------------------- POST /generate (interests, safety alerts) --------------------
@app.post("/generate")
def generate(request: GenerateRequest, client_id: str = Depends(require_client)):
    generation_config = {"temperature": 0.7}
    if request.json_output:
        generation_config["responseMimeType"] = "application/json"

    system_prompt = "You are a travel planning assistant."
    if request.json_output:
        system_prompt += " Always output your response as valid JSON only, with no extra text, no markdown, and no code blocks."

    text = generate_with_fallback(
        lambda: call_gemini([{"parts": [{"text": request.prompt}]}], generation_config),
        lambda: call_deepseek(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.prompt}
            ],
            temperature=0.7,
            max_tokens=4096,
            json_mode=request.json_output,
        ),
    )

    return {"status": "success", "data": {"text": text.strip()}}

# -------------------- GLOBAL EXCEPTION HANDLER --------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "detail": "Internal server error"}
    )
