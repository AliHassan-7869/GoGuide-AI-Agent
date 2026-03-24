from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# Allow any frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HuggingFace Space URL (your AI travel agent)
HF_URL = "https://ali7869-goguidetrip.hf.space/predict"

@app.get("/")
def root():
    return {"message": "FastAPI AI Travel API is live! Use /chat POST endpoint."}

@app.post("/chat")
async def chat(data: dict):
    # Check that the message exists
    user_input = data.get("message")
    if not user_input:
        return {"response": "Error: 'message' key is required in JSON."}

    try:
        # Call HuggingFace Space safely
        response = requests.post(HF_URL, json={"data":[user_input]}, timeout=15)
        response.raise_for_status()  # Raises HTTPError if status != 200

        hf_data = response.json().get("data", ["No response from HuggingFace"])
        return {"response": hf_data[0]}

    except Exception as e:
        # Return friendly error instead of 500
        return {"response": f"Error calling HuggingFace agent: {str(e)}"}
