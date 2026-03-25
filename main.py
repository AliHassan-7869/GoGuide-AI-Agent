from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()

# -------------------- CORS --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- CONFIG --------------------
HF_URL = "https://ali7869-goguidetrip.hf.space/predict"

API_KEY = "goguide-secret"  # change this later

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
    # 🔐 API KEY CHECK (optional but recommended)
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Prepare prompt for your AI
    user_prompt = f"""
    Create a {request.days}-day travel plan for {request.destination}.
    Budget: {request.budget}.
    Include places, activities, and tips.
    """

    try:
        # Call HuggingFace
        response = requests.post(
            HF_URL,
            json={"data": [user_prompt]},
            timeout=25
        )

        response.raise_for_status()

        hf_data = response.json().get("data", ["No response"])

        return {
            "status": "success",
            "data": {
                "destination": request.destination,
                "days": request.days,
                "budget": request.budget,
                "plan": hf_data[0]
            }
        }

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="HuggingFace timeout")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"HF error: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
