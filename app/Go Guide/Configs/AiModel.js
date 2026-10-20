import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "./FirebaseConfig";

// All AI calls go through the GoGuide backend. The app holds no AI provider keys.
// Production: set EXPO_PUBLIC_API_URL=https://<your-backend-domain>
// Local dev: leave it unset. The app reuses the computer address Expo Go connected to,
// on port 8000, so it works on any Windows or Linux machine and any WiFi.
function resolveApiUrl() {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (!__DEV__) return "";

  // Browser: the backend runs on the same computer that serves the web app
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }

  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.28:8081"
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }
  return "";
}

const API_URL = resolveApiUrl();

if (!API_URL) {
  console.error("❌ Backend URL not found. Set EXPO_PUBLIC_API_URL in .env");
} else {
  console.log("[Backend] Using", API_URL);
}

export const generationConfig = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 4096,
};

const REQUEST_TIMEOUT_MS = 120000;

// Calls the backend with the signed-in user's Firebase ID token.
async function callBackend(path, body) {
  if (!API_URL) {
    throw new Error("Backend URL is not configured");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please sign in to use AI features");
  }
  const idToken = await user.getIdToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (networkError) {
    console.error(`[Backend] Network error on ${path}:`, networkError.message);
    throw new Error("Could not reach GoGuide server, please check your connection");
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response, handled below
  }

  if (!response.ok || data?.status !== "success") {
    const detail = typeof data?.detail === "string" ? data.detail : `Server error ${response.status}`;
    console.error(`[Backend] ${path} failed:`, response.status, detail);
    throw new Error(detail);
  }

  return data.data;
}

// Wraps text in the same shape the screens already expect: result.response.text()
const asResult = (text) => ({
  response: {
    text: () => text,
  },
});

async function generateText(prompt) {
  const data = await callBackend("/generate", { prompt: String(prompt).slice(0, 8000), json_output: true });
  return data.text || "";
}

export const model = {
  generateContent: async ({ contents }) => {
    const promptText = contents.map(c => c.parts.map(p => p.text).join("\n")).join("\n\n");
    return asResult(await generateText(promptText));
  }
};

export const chatSession = {
  sendMessage: async (prompt) => asResult(await generateText(prompt)),
};

export const generateTripWithAgent = async (params) => {
  console.log("[Agent] Generating trip for:", params.destination);

  const days = Math.min(30, Math.max(1, parseInt(params.days, 10) || 1));
  const data = await callBackend("/plan", {
    destination: String(params.destination || "").slice(0, 100),
    days,
    budget: String(params.budget || "Moderate").slice(0, 50),
  });

  const plan = data.plan;
  return asResult(typeof plan === "string" ? plan : JSON.stringify(plan));
};

// Conversational Travel Assistant
export const askTravelAssistant = async (userMessage, chatHistory = [], activeTrip = null) => {
  // The screen passes history that already ends with the current user message
  const history = [...chatHistory];
  const last = history[history.length - 1];
  if (last && last.sender === "user" && last.text === userMessage) {
    history.pop();
  }

  const days = parseInt(activeTrip?.days || activeTrip?.totalDays, 10);
  const trip = activeTrip
    ? {
        destination: String(activeTrip.destination || activeTrip.locationInfo?.name || "").slice(0, 100) || null,
        days: days > 0 && days <= 365 ? days : null,
        budget: typeof activeTrip.budget === "string" ? activeTrip.budget.slice(0, 50) : null,
      }
    : null;

  try {
    const data = await callBackend("/chat", {
      message: String(userMessage).slice(0, 2000),
      history: history.slice(-6).map((msg) => ({
        sender: msg.sender === "user" ? "user" : "ai",
        text: String(msg.text || "").slice(0, 4000),
      })),
      trip,
    });
    if (data.reply) return data.reply;
  } catch (e) {
    console.warn("[Copilot] Backend error:", e.message);
  }

  // Graceful fallback response
  return "I'm your GoGuide AI Copilot! Pack comfortable walking shoes, keep your passport handy, and don't forget to try the local street food! How else can I help customize your journey?";
};

// Destination-aware Live AI Safety Alerts
export const fetchDestinationSafety = async (destination) => {
  const dest = destination || "popular international tourist spots";
  const prompt = `Provide 3 realistic and practical safety advisories and emergency precautions for a traveler visiting ${dest}. Return ONLY valid JSON array of objects with this schema:
[
  {
    "id": 1,
    "type": "Safety Advisory / Scam Warning / Health Notice",
    "title": "Short title",
    "description": "Specific, practical 1-2 sentence advice for ${dest}",
    "severity": "High",
    "icon": "shield-outline",
    "color": "#D32F2F",
    "bgColor": "#FFEBEE"
  }
]`;

  try {
    const text = await generateText(prompt);
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (e) {
    console.warn("[Safety AI] Backend error:", e.message);
  }
  return null;
};
