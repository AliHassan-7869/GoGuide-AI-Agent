import { auth } from "./FirebaseConfig";

const LIVE_BACKEND_URL = "https://goguide-ai-agent.onrender.com";

// All AI calls go through the GoGuide backend. The app holds no AI provider keys.
function resolveApiUrl() {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // Always use the live secure backend when hosted on HTTPS (Vercel, custom domain, etc.)
  if (typeof window !== "undefined" && (window.location?.protocol === "https:" || window.location?.hostname?.includes("vercel.app"))) {
    return LIVE_BACKEND_URL;
  }

  // Default to live Render backend for seamless remote sharing, local dev & mobile testing
  return LIVE_BACKEND_URL;
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
async function callBackend(path, body = null, method = "POST", timeoutMs = REQUEST_TIMEOUT_MS) {
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
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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

// Wakes the backend early (the free Render tier sleeps when idle) so the first real request is fast.
// Sends no user data; failures are ignored.
export const warmUpBackend = () => {
  if (!API_URL || typeof fetch !== "function") return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  fetch(`${API_URL}/health`, { method: "GET", signal: controller.signal })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
};

// Interests + transport options for a destination (server-side prompt)
export const fetchDestinationInterests = async (destination) => {
  const data = await callBackend("/destination/interests", { destination: String(destination || "").slice(0, 100) }, "POST", 30000);
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

  // One retry for temporary failures. If it still fails we throw, so the screen shows an honest
  // error instead of a canned tip that looks like a real AI answer.
  const data = await withRetry(
    () =>
      callBackend(
        "/chat",
        {
          message: String(userMessage).slice(0, 2000),
          history: history.slice(-6).map((msg) => ({
            sender: msg.sender === "user" ? "user" : "ai",
            text: String(msg.text || "").slice(0, 4000),
          })),
          trip,
        },
        "POST",
        45000
      ),
    [2500]
  );
  if (!data?.reply) throw new Error("Empty reply from the assistant");
  return data.reply;
};

// Destination-aware Live AI Safety Alerts
export const fetchDestinationSafety = async (destination) => {
  const dest = String(destination || "popular international tourist spots").slice(0, 100);
  try {
    const data = await callBackend("/destination/safety", { destination: dest }, "POST", 30000);
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

// Deterministic local fallback matching travel_essentials.py so Essentials always render instantly & offline
export const buildFallbackDestinationEssentials = (destination) => {
  if (!destination) return null;
  const raw = String(destination).trim();
  const lower = raw.toLowerCase();
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);

  let visaRules =
    "- General Tourist Visa: Check online eVisa availability at official government immigration portals.\n" +
    "- Many popular tourist hubs offer streamlined 30-day eVisa or Visa-on-Arrival.";
  if (lower.includes("dubai") || lower.includes("uae") || lower.includes("abu dhabi")) {
    visaRules =
      "- Visa on Arrival: 70+ nationalities (US, UK, EU, Canada, Australia, Japan, etc.) receive free 30-day stamp.\n" +
      "- Pre-arranged eVisa: 30-day or 60-day tourist visa available online via airlines or GDRFA.\n" +
      "- GCC Residents: Eligible for special GCC resident online entry permits.";
  } else if (
    ["paris", "france", "rome", "italy", "amsterdam", "schengen", "germany", "spain", "europe"].some((c) =>
      lower.includes(c)
    )
  ) {
    visaRules =
      "- Schengen Area: 90 days stay within 180-day rolling window.\n" +
      "- Visa-exempt countries (US, UK, Canada, Australia) require ETIAS pre-authorization.\n" +
      "- Other nationalities require a Schengen Type C Tourist Visa with biometric appointment.";
  } else if (["london", "uk", "united kingdom", "scotland"].some((c) => lower.includes(c))) {
    visaRules =
      "- UK Standard Visitor Visa: Allows up to 6 months stay for tourism.\n" +
      "- Visa-exempt nationalities require UK ETA (Electronic Travel Authorisation).\n" +
      "- Note: UK is not part of Schengen; a separate UK visa is required.";
  } else if (["istanbul", "turkey", "turkiye"].some((c) => lower.includes(c))) {
    visaRules =
      "- Official e-Visa (evisa.gov.tr): Available in 3 minutes for 100+ countries.\n" +
      "- Conditional e-Visa: Holders of valid US, UK, Ireland, or Schengen visas can obtain instant Turkish e-Visa online.\n" +
      "- Visa-free: EU, UK, and several South American citizens enter visa-free up to 90 days.";
  } else if (["lahore", "pakistan", "karachi", "islamabad"].some((c) => lower.includes(c))) {
    visaRules =
      "- Pakistan Online Visa Portal (visa.nadra.gov.pk): Tourist eVisa issued within 48-72 hours.\n" +
      "- Visa on Arrival (Tourist): 60+ countries eligible for Electronic Travel Authorization (ETA) prior to arrival.";
  } else if (["tokyo", "japan", "kyoto", "osaka"].some((c) => lower.includes(c))) {
    visaRules =
      "- Visa-free for 68+ countries (US, Canada, UK, EU, Australia, Singapore) up to 90 days.\n" +
      "- Japan eVisa available online for eligible residents of select countries.";
  }

  const cashPreferred = ["lahore", "karachi", "cairo", "hanoi", "kathmandu", "delhi", "mumbai", "bangkok"];
  const cardDominant = ["london", "new york", "amsterdam", "paris", "tokyo", "singapore", "dubai", "sydney"];
  let paymentMode =
    "Hybrid: Cards widely accepted at hotels and restaurants; carry moderate local cash for small purchases and taxis.";
  if (cardDominant.some((c) => lower.includes(c))) {
    paymentMode =
      "Credit/Debit cards, Apple Pay, and contactless payments are accepted almost everywhere. Minimal cash needed.";
  } else if (cashPreferred.some((c) => lower.includes(c))) {
    paymentMode =
      "Cash is preferred for street markets, local transit, and small dining; cards accepted at major malls and hotels.";
  }

  let contacts = "Universal Emergency (GSM): 112 or 911 | Inquire at your hotel front desk upon arrival.";
  let water = "When uncertain, consume sealed bottled water and avoid iced drinks from street vendors.";
  if (lower.includes("dubai") || lower.includes("uae") || lower.includes("abu dhabi")) {
    contacts = "Police: 999 | Ambulance: 998 | Fire: 997 | Tourist Police Hotline: 901";
    water = "Tap water is safe for brushing/cooking; bottled or filtered water is preferred for drinking.";
  } else if (lower.includes("london") || lower.includes("uk") || lower.includes("united kingdom")) {
    contacts = "Emergency (Police / Ambulance / Fire): 999 or 112 | Non-emergency medical: 111";
    water = "Tap water is 100% strictly tested, pristine, and safe to drink.";
  } else if (["paris", "france", "rome", "italy", "amsterdam", "madrid", "berlin"].some((c) => lower.includes(c))) {
    contacts = "European Universal Emergency Number: 112 | Medical SAMU (France): 15 | Police: 17";
    water = "Tap water is completely safe and potable throughout public cafes and hotels.";
  } else if (lower.includes("istanbul") || lower.includes("turkey")) {
    contacts = "Unified Emergency Call: 112 (Police, Ambulance, Fire) | Tourist Police: +90 212 527 4503";
    water = "Bottled water is universally recommended for drinking; readily available everywhere.";
  } else if (["lahore", "pakistan", "karachi", "islamabad"].some((c) => lower.includes(c))) {
    contacts = "Rescue 1122 (Ambulance/Fire) | Police Helpline: 15 | Tourist Helpline: 1421";
    water = "Only consume sealed bottled mineral water or boiled water.";
  } else if (["tokyo", "japan", "kyoto", "osaka"].some((c) => lower.includes(c))) {
    contacts = "Police: 110 | Ambulance / Fire: 119 | Japan Helpline: 0570-000-911";
    water = "Tap water is strictly regulated, mineral-rich, and safe to drink anywhere.";
  }

  let events =
    "- National Cultural & Heritage Days: Parades, concerts, and museum events.\n" +
    "- Seasonal Night Markets & Street Food Carnivals: Vibrant local artisan gatherings.";
  if (lower.includes("dubai")) {
    events =
      "- Dubai Shopping Festival (Dec - Jan): Citywide mega-sales, fireworks, and concerts.\n" +
      "- Dubai Food Festival (April - May): Street food carnivals and chef tables.";
  } else if (lower.includes("paris")) {
    events =
      "- Bastille Day (July 14): Military parade on Champs-Élysées and Eiffel Tower fireworks.\n" +
      "- Paris Fashion Week & Winter Markets: Iconic cultural showcases and festive chalets.";
  } else if (lower.includes("istanbul")) {
    events =
      "- Istanbul Tulip Festival (April): Over 30 million vibrant tulips blooming in Emirgan and Gülhane parks.\n" +
      "- Bosphorus Cross-Continental Swim & Jazz Festivals: Waterfront concerts and races.";
  } else if (lower.includes("london")) {
    events =
      "- Wimbledon Championships (July) & Notting Hill Carnival (August): Iconic summer traditions.\n" +
      "- Hyde Park Winter Wonderland (Nov - Jan): Observation wheel, ice skating, and festive markets.";
  } else if (lower.includes("lahore")) {
    events =
      "- Lahore Literary Festival (Feb) & Mela Chiraghan (March): Cultural arts and historic Sufi festivities.\n" +
      "- Spring Floral Gala: Traditional folk performances and vibrant garden displays.";
  } else if (lower.includes("tokyo")) {
    events =
      "- Cherry Blossom Season (late March - April): Hanami picnics in Ueno and Shinjuku Gyoen.\n" +
      "- Sumida River Fireworks (July) & Meiji Shrine Autumn Festival (Nov): Traditional celebrations.";
  }

  return {
    destination: title,
    visa:
      `Visa & Entry Guidelines for ${title}:\n${visaRules}\n` +
      "- Universal Requirements: Passport must have minimum 6 months validity from entry date.\n" +
      "- Must-Have Documents: Confirmed return flight ticket, hotel reservation proof, and travel health insurance.",
    currency:
      `Payment & Currency Guidance for ${title}:\n` +
      `- Payment Norm: ${paymentMode}\n` +
      "- ATM Tip: Use bank-attached ATMs during business hours to avoid foreign card skimmers.\n" +
      "- Tipping: 5-10% in casual dining if service charge is not included; rounding up taxi fares is customary.",
    emergency:
      `Emergency & Health Brief for ${title}:\n` +
      `- Emergency Hotlines: ${contacts}\n` +
      `- Drinking Water Safety: ${water}\n` +
      "- Travel Pharmacy Kit: Carry personal prescriptions in original boxes, rehydration salts, and basic painkillers.",
    events:
      `Major Seasonal Events & Cultural Highlights for ${title}:\n${events}\n` +
      "Tip: Book accommodation and attraction tickets well in advance if traveling during a major festival.",
  };
};

// 100% Free Zero-Token Destination Essentials (Visa, Events, Emergency, Currency)
export const fetchDestinationEssentials = async (destination) => {
  if (!destination) return null;
  try {
    const encoded = encodeURIComponent(String(destination).trim().slice(0, 100));
    const remote = await callBackend(`/tools/destination-info?destination=${encoded}`, null, "GET");
    return remote || buildFallbackDestinationEssentials(destination);
  } catch (e) {
    console.warn("[Essentials Tool] Notice:", e.message);
    return buildFallbackDestinationEssentials(destination);
  }
};
