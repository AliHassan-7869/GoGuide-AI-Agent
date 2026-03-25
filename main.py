import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from pydantic import BaseModel
import requests

app = FastAPI(title="GoGuide AI API")

# -------------------- CORS --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow any frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- CONFIG --------------------
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
API_KEY = os.getenv("API_KEY") or "goguide-secret"

# -------------------- REQUEST MODEL --------------------
class TravelRequest(BaseModel):
    destination: str
    days: int
    budget: str

# -------------------- ROOT --------------------
@app.get("/")
def home():
    return {"message": "GoGuide AI API Running 🚀"}

# -------------------- HEALTH --------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------- MAIN ENDPOINT (POST) --------------------
@app.post("/plan")
def generate_plan(request: TravelRequest, x_api_key: str = Header(None)):
    # Optional API key check
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = {
        "destination": request.destination,
        "days": request.days,
        "budget": request.budget
    }

    try:
        response = requests.post(
            "https://api.deepseek.ai/travel-plan",  # Replace with actual DeepSeek endpoint
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json=payload,
            timeout=25
        )
        response.raise_for_status()
        plan_data = response.json()

        return {
            "status": "success",
            "data": {
                "destination": request.destination,
                "days": request.days,
                "budget": request.budget,
                "plan": plan_data
            }
        }

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="DeepSeek API request timed out")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"DeepSeek API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

# -------------------- BROWSER-FRIENDLY GET --------------------
@app.get("/plan")
def generate_plan_get(destination: str, days: int, budget: str, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return {
        "status": "success",
        "message": "Send a POST request to /plan with JSON payload to generate the travel plan",
        "input": {"destination": destination, "days": days, "budget": budget}
    }

# -------------------- GLOBAL EXCEPTION HANDLER --------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"status": "error", "detail": str(exc)}
    )
