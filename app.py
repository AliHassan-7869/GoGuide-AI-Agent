from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# Allow any frontend to call your API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_URL = "https://ali7869-goguidetrip.hf.space/predict"

@app.post("/chat")
async def chat(data: dict):
    # 1️⃣ Check if 'message' key exists
    user_input = data.get("message")
    if not user_input:
        return {"response": "Error: 'message' key is required in JSON."}

    try:
        # 2️⃣ Call HuggingFace agent safely
        hf_response = requests.post(HF_URL, json={"data":[user_input]}, timeout=15)
        hf_response.raise_for_status()  # raise error if status != 200
        data_from_hf = hf_response.json().get("data", ["No response from agent"])
        return {"response": data_from_hf[0]}
    except Exception as e:
        # 3️⃣ Catch network / agent errors
        return {"response": f"Error calling HuggingFace agent: {str(e)}"}
