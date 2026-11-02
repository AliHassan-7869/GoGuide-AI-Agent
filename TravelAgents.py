import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from crewai import Agent, LLM
from TravelTools import (
    search_web_tool,
    get_weather,
    flight_estimate,
    hotel_estimate,
    currency_estimate,
    visa_requirements_tool,
    local_events_and_festivals_tool,
    emergency_and_health_tool,
)

gemini_api_key = os.getenv("GEMINI_API_KEY")
deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
deepseek_api_base = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")

if gemini_api_key:
    fast_llm = LLM(
        model=os.getenv("CREWAI_MODEL", "gemini/gemini-2.0-flash"),
        api_key=gemini_api_key,
        temperature=0.4,
    )
elif deepseek_api_key:
    fast_llm = LLM(
        model="openai/deepseek-chat",
        base_url=deepseek_api_base,
        api_key=deepseek_api_key,
        temperature=0.4,
    )
else:
    raise ValueError("Neither GEMINI_API_KEY nor DEEPSEEK_API_KEY is set in .env file or environment variables.")

# =====================================================================
# 4 CORE STREAMLINED AGENTS (High Accuracy, 60%+ Token Savings)
# =====================================================================

# 1. Destination & Culture Specialist (Merges Location, Guide, Food & Weather)
destination_agent = Agent(
    role="Destination & Culture Specialist",
    goal="Discover top attractions, local food specialties, cultural highlights, and weather expectations for the trip.",
    backstory=(
        "You are an experienced local concierge and culture specialist. "
        "You provide concise, high-value recommendations on attractions, must-eat local dishes, "
        "and seasonal weather advice without fluffy or repetitive text."
    ),
    tools=[search_web_tool, get_weather, local_events_and_festivals_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

# 2. Budget & Transit Strategist (Merges Budget, Hotels & Transportation)
budget_transport_agent = Agent(
    role="Budget & Transit Strategist",
    goal="Optimize travel routes, flight/train transit logistics, and provide a realistic accommodation and daily budget breakdown.",
    backstory=(
        "You are a travel financial planner and logistics optimizer. "
        "You determine practical transit methods, estimate real hotel and food expenses, "
        "and maximize trip value within the traveler's stated budget."
    ),
    tools=[search_web_tool, flight_estimate, hotel_estimate, currency_estimate, visa_requirements_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

# 3. Safety & Preparation Advisor (Merges Safety, Scams & Packing Essentials)
safety_prep_agent = Agent(
    role="Travel Safety & Preparation Advisor",
    goal="Provide essential safety advisories, common tourist scams to avoid, emergency numbers, and a weather-adapted packing checklist.",
    backstory=(
        "You are an international travel safety expert. "
        "You keep tourists secure, alert to local scams, and perfectly packed for destination conditions."
    ),
    tools=[search_web_tool, emergency_and_health_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

# 4. Master Itinerary Architect (Final Compiler & Synthesizer)
planner_expert = Agent(
    role="Master Travel Itinerary Architect",
    goal="Synthesize all specialist findings into a cohesive, beautifully structured, day-by-day travel itinerary.",
    backstory=(
        "You are a master itinerary designer. You take specialist inputs on attractions, budget, transit, "
        "and safety to craft an unforgettable, realistic, and polished travel plan in clean Markdown."
    ),
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

# Backward-compatibility aliases for legacy scripts
guide_expert = destination_agent
location_expert = destination_agent
food_agent = destination_agent
weather_agent = destination_agent
transport_agent = budget_transport_agent
budget_agent = budget_transport_agent
safety_agent = safety_prep_agent
packing_agent = safety_prep_agent
