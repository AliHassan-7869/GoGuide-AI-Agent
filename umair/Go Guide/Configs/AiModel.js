const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const deepseekApiKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;

if (geminiApiKey) {
  console.log("✅ Gemini API Key loaded (starts with:", geminiApiKey.substring(0, 8) + "...)");
} else if (deepseekApiKey) {
  console.log("✅ DeepSeek API Key loaded (starts with:", deepseekApiKey.substring(0, 8) + "...)");
} else {
  console.error("❌ No AI API Key found in .env!");
}

export const generationConfig = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 4096,
};

// Direct Gemini API Call (Fast & Active)
async function callGeminiAPI(promptText) {
  console.log("[Gemini] Calling Gemini 2.5 Flash API...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: generationConfig.temperature,
          responseMimeType: "application/json"
        }
      })
    });
  } catch (networkError) {
    console.error("[Gemini] Network error:", networkError.message);
    throw new Error(`Network error connecting to Gemini: ${networkError.message}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Gemini] API Error:", response.status, errText);
    throw new Error(`Gemini API Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    response: {
      text: () => content.trim(),
    }
  };
}

// DeepSeek API Call (Fallback)
async function callDeepSeekAPI(messages) {
  console.log("[DeepSeek] Calling API with", messages.length, "messages...");

  const requestBody = {
    model: "deepseek-chat",
    messages: messages,
    temperature: generationConfig.temperature,
    top_p: generationConfig.top_p,
    max_tokens: generationConfig.max_tokens,
  };

  let response;
  try {
    response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    console.error("[DeepSeek] Network error:", networkError.message);
    throw new Error(`Network error connecting to DeepSeek: ${networkError.message}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("[DeepSeek] API Error:", response.status, errText);
    throw new Error(`DeepSeek API Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "";
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  return {
    response: {
      text: () => content,
    }
  };
}

export const model = {
  generateContent: async ({ contents }) => {
    const promptText = contents.map(c => c.parts.map(p => p.text).join("\n")).join("\n\n");
    if (geminiApiKey) {
      return callGeminiAPI(promptText);
    }
    const messages = contents.map(c => ({
      role: c.role === "model" ? "assistant" : "user",
      content: c.parts.map(p => p.text).join("\n"),
    }));
    return callDeepSeekAPI(messages);
  }
};

export const chatSession = {
  sendMessage: async (prompt) => {
    if (geminiApiKey) {
      return callGeminiAPI(prompt);
    }
    const messages = [
      {
        role: "system",
        content: "You are a travel planning assistant. Always output your response as valid JSON only, with no extra text, no markdown, and no code blocks."
      },
      {
        role: "user",
        content: prompt
      }
    ];
    return callDeepSeekAPI(messages);
  }
};

const AI_AGENT_URL = "https://goguide-ai-agent.onrender.com/plan";
const AI_AGENT_KEY = "goguide-secret";

export const generateTripWithAgent = async (params) => {
  console.log("[Agent] Generating trip for:", params.destination);

  const prompt = `Plan a ${params.days}-day trip to ${params.destination} with a ${params.budget} budget. Return ONLY valid JSON with this structure:
{
  "trip": {
    "destination": "string",
    "duration": "X Days Y Nights",
    "budget": "string",
    "hotels": [
      {
        "name": "string",
        "address": "string",
        "price": "string",
        "coordinates": {"lat": number, "lng": number},
        "rating": "string"
      }
    ],
    "itinerary": [
      {
        "day": number,
        "theme": "string",
        "activities": [
          {
            "time": "string",
            "placeName": "string",
            "details": "string",
            "tickets": "string",
            "coordinates": {"lat": number, "lng": number}
          }
        ]
      }
    ]
  }
}`;

  // 1. Try Backend Agent API first
  try {
    console.log("[Agent] Trying Agent API first...");
    const agentResponse = await fetch(AI_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AI_AGENT_KEY
      },
      body: JSON.stringify({
        destination: params.destination,
        days: parseInt(params.days),
        budget: params.budget
      }),
    });

    if (agentResponse.ok) {
      const data = await agentResponse.json();
      if (data.status === "success") {
        const plan = data.data.plan;
        console.log("[Agent] Agent API succeeded!");
        return {
          response: {
            text: () => typeof plan === 'string' ? plan : JSON.stringify(plan),
          }
        };
      }
    }
    console.warn("[Agent] Agent API failed, falling back to direct AI model...");
  } catch (e) {
    console.warn("[Agent] Agent API error, falling back to direct AI model:", e.message);
  }

  // 2. Fallback: Call direct Gemini (or DeepSeek if Gemini is not set)
  if (geminiApiKey) {
    return callGeminiAPI(prompt);
  }

  const messages = [
    {
      role: "system",
      content: "You are a travel planning assistant. Always output your response as valid JSON only, with no extra text, no markdown, and no code blocks."
    },
    {
      role: "user",
      content: prompt
    }
  ];

  return callDeepSeekAPI(messages);
};

// Conversational Travel Assistant
export const askTravelAssistant = async (userMessage, chatHistory = [], activeTrip = null) => {
  const tripContext = activeTrip
    ? `Current Planned Trip: Destination: ${activeTrip.destination || activeTrip.locationInfo?.name || "Not specified"}, Duration: ${activeTrip.days || activeTrip.totalDays || "N/A"} days, Budget: ${activeTrip.budget || "Flexible"}.`
    : "No active trip selected yet.";

  const systemInstruction = `You are "GoGuide AI Copilot", an elite, world-class AI travel guide and trip concierge.
${tripContext}
Your style:
- Friendly, inspiring, crisp, and high-energy with relevant emojis (✈️, 🍜, 📍, 💡, 💰, 🏨).
- Use clear bullet points and bold highlights for readability.
- When asked about places or food, include names, vibes, and price estimates.
- Keep responses compact, punchy, and easy to read on mobile screens (avoid huge text walls).
- If the user writes in Urdu or Roman Urdu, reply warmly in Roman Urdu/English mix!`;

  if (geminiApiKey) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    
    // Format conversation history for Gemini contents
    const contents = [];
    contents.push({
      role: "user",
      parts: [{ text: `[System Instruction: ${systemInstruction}]\n\nHello!` }]
    });
    contents.push({
      role: "model",
      parts: [{ text: "Hello! I am your GoGuide AI Copilot. Where are we heading next?" }]
    });

    chatHistory.slice(-6).forEach((msg) => {
      contents.push({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      });
    });

    contents.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    try {
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.8,
            top_p: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return reply.trim();
      }
    } catch (e) {
      console.warn("[Copilot] Gemini API error, falling back:", e.message);
    }
  }

  // Fallback to DeepSeek if Gemini fails or is not available
  if (deepseekApiKey) {
    const messages = [
      { role: "system", content: systemInstruction },
      ...chatHistory.slice(-6).map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text
      })),
      { role: "user", content: userMessage }
    ];
    try {
      const dsRes = await callDeepSeekAPI(messages);
      return dsRes.response.text();
    } catch (e) {
      console.warn("[Copilot] DeepSeek fallback error:", e.message);
    }
  }

  // Graceful fallback response
  return "I'm your GoGuide AI Copilot! Pack comfortable walking shoes, keep your passport handy, and don't forget to try the local street food! How else can I help customize your journey?";
};

