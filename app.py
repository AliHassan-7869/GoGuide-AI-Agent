import json
import logging
import os
import re
import secrets
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
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
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# -------------------- CONFIG --------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
API_KEY = os.getenv("API_KEY")

# -------------------- AUTH --------------------
def verify_api_key(x_api_key: str | None):
    if not API_KEY:
        logger.error("API_KEY is not configured on server")
        raise HTTPException(status_code=503, detail="Service not configured")
    if not x_api_key or not secrets.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Unauthorized")

# -------------------- REQUEST MODEL --------------------
class TravelRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=100)
    days: int = Field(ge=1, le=30)
    budget: str = Field(min_length=1, max_length=50)

# -------------------- ROOT --------------------
@app.get("/")
def home():
    return {"message": "GoGuide AI API Running 🚀"}

# -------------------- HEALTH --------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------- POST /plan (main functionality) --------------------
@app.post("/plan")
def generate_plan(request: TravelRequest, x_api_key: str | None = Header(default=None)):
    verify_api_key(x_api_key)

    gemini_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    deepseek_key = os.getenv("DEEPSEEK_API_KEY") or DEEPSEEK_API_KEY

    if not gemini_key and not deepseek_key:
        logger.error("Neither GEMINI_API_KEY nor DEEPSEEK_API_KEY is configured on server")
        raise HTTPException(status_code=503, detail="Service not configured")

    prompt = f"""Plan a {request.days}-day trip to {request.destination} with a {request.budget} budget. Return ONLY valid JSON with this structure:
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

    raw_content = ""

    # 1. Use Gemini if available (fast & active)
    if gemini_key:
        try:
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
            gemini_payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "responseMimeType": "application/json"
                }
            }
            response = requests.post(
                url,
                headers={"x-goog-api-key": gemini_key},
                json=gemini_payload,
                timeout=60
            )
            response.raise_for_status()
            res_json = response.json()
            raw_content = res_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except requests.exceptions.RequestException as e:
            logger.error("Gemini API error: %s", e)
            raise HTTPException(status_code=502, detail="AI service error, please try again")

    # 2. Otherwise use DeepSeek
    elif deepseek_key:
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert travel planning assistant. Always output your response as valid JSON only, without any markdown formatting, code block fences, or extra text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4096,
            "response_format": {"type": "json_object"}
        }

        try:
            response = requests.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {deepseek_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            result_data = response.json()
            raw_content = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except requests.exceptions.RequestException as e:
            logger.error("DeepSeek API error: %s", e)
            raise HTTPException(status_code=502, detail="AI service error, please try again")

    # Clean content
    clean_content = re.sub(r"<think>[\s\S]*?</think>", "", raw_content).strip()
    clean_content = re.sub(r"^```(?:json)?", "", clean_content, flags=re.MULTILINE)
    clean_content = re.sub(r"```$", "", clean_content, flags=re.MULTILINE).strip()

    try:
        plan_data = json.loads(clean_content)
    except json.JSONDecodeError:
        plan_data = clean_content

    return {
        "status": "success",
        "data": {
            "destination": request.destination,
            "days": request.days,
            "budget": request.budget,
            "plan": plan_data
        }
    }

# -------------------- GET /plan (browser-friendly) --------------------
@app.get("/plan")
def generate_plan_get(x_api_key: str | None = Header(default=None)):
    verify_api_key(x_api_key)

    return {
        "status": "success",
        "message": "Please send a POST request to /plan with JSON payload to generate the travel plan."
    }

# -------------------- GLOBAL EXCEPTION HANDLER --------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "detail": "Internal server error"}
    )