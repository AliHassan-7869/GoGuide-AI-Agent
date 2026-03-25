from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_URL = "https://ali7869-goguidetrip.hf.space/predict"

@app.get("/")
def root():
    return {"message": "GoGuide API is running 🚀"}

@app.post("/chat")
async def chat(data: dict):
    user_input = data.get("message")

    if not user_input:
        return {"error": "'message' is required"}

    try:
        response = requests.post(
            HF_URL,
            json={"data": [user_input]},
            timeout=20
        )

        response.raise_for_status()

        hf_data = response.json().get("data", ["No response"])
        
        return {
            "status": "success",
            "user_input": user_input,
            "response": hf_data[0]
        }

    except requests.exceptions.Timeout:
        return {"error": "Request timeout. HuggingFace is slow."}

    except requests.exceptions.RequestException as e:
        return {"error": f"HuggingFace error: {str(e)}"}

    except Exception as e:
        return {"error": f"Internal error: {str(e)}"}
