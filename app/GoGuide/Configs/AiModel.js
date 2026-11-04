import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "./FirebaseConfig";

const LIVE_BACKEND_URL = "https://goguide-ai-agent.onrender.com";

// All AI calls go through the GoGuide backend. The app holds no AI provider keys.
function resolveApiUrl() {
  // Always use the live secure backend when hosted on HTTPS (Vercel, custom domain, etc.)
  if (typeof window !== "undefined" && (window.location?.protocol === "https:" || window.location?.hostname?.includes("vercel.app"))) {
    return LIVE_BACKEND_URL;
  }

  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // Default to live Render backend for seamless remote sharing & testing
  if (!__DEV__) {
    return LIVE_BACKEND_URL;
  }

  // Browser: the backend runs on the same computer that serves the web app
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:8000`;
    }
    return "http://localhost:8000";
  }

  // Check all possible places Expo stores the host URI across SDK versions
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }

  if (Constants.linkingUri) {
    const match = Constants.linkingUri.match(/:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== "localhost") {
      return `http://${match[1]}:8000`;
    }
  }

  // Fallback in local development
  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8000";
    }
    return "http://localhost:8000";
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

async function ensureUserAuth() {
  if (auth.currentUser) return auth.currentUser;
  try {
    const { signInAnonymously } = await import("firebase/auth");
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.warn("[Auth] Anonymous auto-signin notice:", e?.message);
    return null;
  }
}

// Calls the backend with the signed-in user's Firebase ID token.
async function callBackend(path, body = null, method = "POST") {
  if (!API_URL) {
    throw new Error("Backend URL is not configured");
  }

  let user = auth.currentUser;
  if (!user) {
    user = await ensureUserAuth();
  }
  if (!user) {
    throw new Error("Please sign in to use AI features");
  }
  const idToken = await user.getIdToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      signal: controller.signal,
    };
    if (body && method !== "GET") {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    response = await fetch(`${API_URL}${path}`, options);
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
  const payload = {
    destination: String(params.destination || "").slice(0, 100),
    days,
    budget: String(params.budget || "Moderate").slice(0, 50),
  };
  if (params.interests) {
    payload.interests = String(params.interests).slice(0, 500);
  }
  if (params.categories) {
    payload.categories = String(params.categories).slice(0, 300);
  }
  const data = await callBackend("/plan", payload);

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

// Premium Deep Plan (Async background polling with zero timeout risk)
export const generateDeepTripPlan = async (params, onProgress) => {
  console.log("[DeepAgent] Enqueueing deep trip for:", params.destination);
  const days = Math.min(30, Math.max(1, parseInt(params.days, 10) || 1));
  const payload = {
    destination: String(params.destination || "").slice(0, 100),
    days,
    budget: String(params.budget || "Moderate").slice(0, 50),
  };
  if (params.interests) payload.interests = String(params.interests).slice(0, 500);
  if (params.categories) payload.categories = String(params.categories).slice(0, 300);

  // 1. Kick off background task
  const initData = await callBackend("/plan-deep", payload, "POST");
  const jobId = initData.job_id;

  // 2. Poll until complete (maximum 30 polls = ~90 seconds)
  const maxAttempts = 30;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (onProgress) {
      onProgress(Math.min(95, Math.round(((attempt + 1) / maxAttempts) * 100)));
    }
    const statusData = await callBackend(`/plan-deep/${jobId}`, null, "GET");
    if (statusData.status === "ready" && statusData.plan) {
      const plan = statusData.plan;
      return asResult(typeof plan === "string" ? plan : JSON.stringify(plan));
    }
  }

  throw new Error("Deep plan is taking longer than expected. Please try again.");
};

// 100% Free Zero-Token Destination Essentials (Visa, Events, Emergency, Currency)
export const fetchDestinationEssentials = async (destination) => {
  if (!destination) return null;
  try {
    const encoded = encodeURIComponent(String(destination).trim().slice(0, 100));
    return await callBackend(`/tools/destination-info?destination=${encoded}`, null, "GET");
  } catch (e) {
    console.warn("[Essentials Tool] Notice:", e.message);
    return null;
  }
};

// 2FA Security: Request 6-digit Email OTP
export const send2FaOtp = async (email) => {
  if (!API_URL) throw new Error("Backend URL is not configured");
  const cleanEmail = String(email || "").trim().toLowerCase();
  const res = await fetch(`${API_URL}/auth/send-2fa-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== "success") {
    throw new Error(data.detail || "Unable to send verification code. Please try again.");
  }
  return data;
};

// 2FA Security: Verify 6-digit Email OTP
export const verify2FaOtp = async (email, code) => {
  if (!API_URL) throw new Error("Backend URL is not configured");
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();
  const res = await fetch(`${API_URL}/auth/verify-2fa-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== "success") {
    throw new Error(data.detail || "Invalid or expired verification code.");
  }
  return data;
};

