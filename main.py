import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()

# -------------------- CORS --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow any frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- CONFIG --------------------
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")  # your Render environment variable
API_KEY = os.getenv("API_KEY") or "goguide-secret"  # optional protection for your API

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

# -------------------- MAIN ENDPOINT --------------------
@app.post("/plan")
def generate_plan(
    request: TravelRequest,
    x_api_key: str = Header(None)
):
    # 🔐 Optional: check API key for your own API
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Prepare the payload for DeepSeek API
    payload = {
        "destination": request.destination,
        "days": request.days,
        "budget": request.budget
    }

    try:
        # Call DeepSeek API
        response = requests.post(
            "https://api.deepseek.ai/travel-plan",  # Replace with actual DeepSeek endpoint
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json=payload,
            timeout=25
        )
        response.raise_for_status()  # raise error if non-200

        plan_data = response.json()  # DeepSeek response

        # Return structured response
        return {
            "status": "success",
            "data": {
                "destination": request.destination,
                "days": request.days,
                "budget": request.budget,
                "plan": plan_data  # can be string or structured JSON from DeepSeek
            }
        }

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="DeepSeek API request timed out")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"DeepSeek API error: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
