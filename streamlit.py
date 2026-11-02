import re
import streamlit as st
from datetime import date
from crewai import Crew

from TravelAgents import (
    destination_agent,
    budget_transport_agent,
    safety_prep_agent,
    planner_expert,
)
from TravelTasks import (
    destination_task,
    budget_transport_task,
    safety_prep_task,
    planner_task,
)

# ========== Security & Input Sanitization ==========
INJECTION_PATTERN = re.compile(
    r"(?i)\b("
    r"ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|"
    r"disregard\s+(?:all\s+)?(?:previous|prior)\s+directions|"
    r"reveal\s+(?:the\s+)?(?:system\s+prompt|instructions|secret|api[_\s-]?key)|"
    r"system\s+instruction|"
    r"developer\s+mode|"
    r"you\s+are\s+now\s+(?:dan|unrestricted)|"
    r"bypass\s+all\s+(?:rules|filters|restrictions)|"
    r"jailbreak"
    r")\b"
)


def sanitize_input(text: str | None, max_length: int = 500) -> str:
    if not text:
        return ""
    clean = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", str(text))
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean.strip()[:max_length]


def has_injection(text: str | None) -> bool:
    return bool(INJECTION_PATTERN.search(text or ""))


# ========== Streamlit UI ==========

st.set_page_config(page_title="🌍 GoGuide World Trip Planner", layout="wide")

st.title("🌍 GoGuide World Trip Planner")
st.markdown("Plan your next journey with our specialized 4-Agent Travel Intelligence Crew!")

# Sidebar for trip input
with st.sidebar:
    st.header("✈️ Trip Preferences")
    raw_from_city = st.text_input("From City", placeholder="e.g., London, Lahore, New York")
    raw_dest_city = st.text_input("Destination City", placeholder="e.g., Dubai, Paris, Istanbul")
    date_from = st.date_input("Departure Date", min_value=date.today())
    date_to = st.date_input("Return Date", min_value=date.today())
    budget = st.slider("Budget (USD)", 300, 10000, 1500, step=100)
    travelers = st.selectbox("Number of Travelers", [1, 2, 3, 4, "5+"])
    travel_type = st.selectbox(
        "Travel Type",
        ["Solo", "Couple", "Family", "Friends"]
    )
    raw_interests = st.text_area("Your Interests (e.g., Food, Culture, History, Architecture, Adventure)")

    st.markdown("---")
    if st.button("🔄 Reset Form"):
        st.session_state.clear()
        st.rerun()

# ========== Run AI Planning Crew ==========
if st.button("🛫 Generate Travel Plan"):
    from_city = sanitize_input(raw_from_city, 100)
    destination_city = sanitize_input(raw_dest_city, 100)
    interests = sanitize_input(raw_interests, 400)

    # Validate input
    if not (from_city and destination_city and interests):
        st.error("⚠️ Please fill all required fields before generating your travel plan.")
    elif has_injection(from_city) or has_injection(destination_city) or has_injection(interests):
        st.error("⚠️ Invalid or restricted prompt keywords detected. Please enter standard travel destinations and interests.")
    elif date_to < date_from:
        st.error("⚠️ Return date cannot be before departure date.")
    else:
        st.info("🚀 Assembling your 4-agent crew (Destination, Budget, Safety & Planner)... please wait ⏳")

        try:
            # 1. Destination & Culture Task
            dest_task = destination_task(
                destination_agent, destination_city, interests, date_from, date_to
            )

            # 2. Budget & Transit Task
            budget_task = budget_transport_task(
                budget_transport_agent, from_city, destination_city, budget, travelers
            )

            # 3. Safety & Preparation Task
            safety_task = safety_prep_task(
                safety_prep_agent, destination_city, date_from, date_to, travelers
            )

            # 4. Master Itinerary Synthesis Task
            plan_task = planner_task(
                [dest_task, budget_task, safety_task],
                planner_expert,
                destination_city,
                interests,
                date_from,
                date_to,
                budget,
                travelers,
            )

            # Initialize Streamlined 4-Agent Crew
            crew = Crew(
                agents=[destination_agent, budget_transport_agent, safety_prep_agent, planner_expert],
                tasks=[dest_task, budget_task, safety_task, plan_task],
                full_output=True,
                verbose=True,
            )

            # Run the crew
            result = crew.kickoff()

            # Display results
            st.success("✅ Your personalized travel plan is ready!")
            st.subheader(f"🗺️ {destination_city.title()} Travel Itinerary")
            st.markdown(result if isinstance(result, str) else str(result))

            # Save and offer download
            file_name = f"TravelPlan_{destination_city.replace(' ', '_')}.md"
            st.download_button(
                label="📥 Download Itinerary (Markdown)",
                data=str(result),
                file_name=file_name,
                mime="text/markdown",
            )

        except Exception as e:
            st.error(f"❌ Something went wrong: {e}")
