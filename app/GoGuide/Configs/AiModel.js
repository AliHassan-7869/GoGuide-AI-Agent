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
    console.warn(`[Backend] Network error on ${path}:`, networkError.message);
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
    console.warn(`[Backend] ${path} failed:`, response.status, detail);
    throw new Error(detail);
  }

  return data.data;
}

// Retries only failures that are likely temporary (server waking up, network blip, AI hiccup).
const isTransient = (e) =>
  /reach GoGuide server|Server error 5|AI service error|Auth service unavailable/i.test(String(e?.message || ""));

async function withRetry(fn, delaysMs = [3000, 7000]) {
  let lastError;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isTransient(e) || attempt === delaysMs.length) break;
      await new Promise((r) => setTimeout(r, delaysMs[attempt]));
    }
  }
  throw lastError;
}

// Wraps text in the same shape the screens already expect: result.response.text()
const asResult = (text) => ({
  response: {
    text: () => text,
  },
});

// Interests + transport options for a destination (server-side prompt)
export const fetchDestinationInterests = async (destination) => {
  const data = await callBackend("/destination/interests", { destination: String(destination || "").slice(0, 100) });
  return { interests: data.interests || [], transports: data.transports || [] };
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
  const data = await withRetry(() => callBackend("/plan", payload));

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
  const dest = String(destination || "popular international tourist spots").slice(0, 100);
  try {
    const data = await callBackend("/destination/safety", { destination: dest });
    return Array.isArray(data.alerts) && data.alerts.length ? data.alerts : null;
  } catch (e) {
    console.warn("[Safety AI] Backend error:", e.message);
    return null;
  }
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
