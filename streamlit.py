import streamlit as st
from datetime import date
from crewai import Crew
from TravelAgents import guide_expert, location_expert, planner_expert, budget_agent, destination_agent, weather_agent, food_agent, transport_agent, safety_agent, packing_agent
from TravelTasks import location_task, guide_task, planner_task, budget_task, destination_task, weather_task, transport_task, food_task, safety_task, packing_task

# ========== Streamlit UI ==========

st.set_page_config(page_title="🌍 GoGuide World Trip Planner", layout="wide")

st.title("🌍 GoGuide")
st.markdown("""
Welcome to GoGuide AI-Powered Travel Planner!""")

# Sidebar for trip input
with st.sidebar:
    st.header("✈️ Trip Preferences")
    from_city = st.text_input("From City", placeholder="e.g.,London,France")
    destination_city = st.text_input("Destination City", placeholder="e.g.,Turkey,Dubai")
    date_from = st.date_input("Departure Date", min_value=date.today())
    date_to = st.date_input("Return Date", min_value=date.today())
    budget = st.slider("Budget (USD)", 300, 5000, 1500, step=100)
    travelers = st.selectbox("Number of Travelers", [1, 2, 3, 4, "5+"])
    travel_type = st.selectbox(
        "Travel Type",
        ["Solo", "Couple", "Family", "Friends"]
    )
    interests = st.text_area("Your Interests (e.g., Foods, Culture, History, Adventure)")

    st.markdown("---")
    if st.button("🔄 Reset Form"):
        st.session_state.clear()
        st.rerun()

# ========== Run AI Planning Crew ==========
if st.button("🛫 Generate Travel Plan"):
    # Validate input
    if not (from_city and destination_city and interests):
        st.error("⚠️ Please fill all fields before generating your travel plan.")
    else:
        st.info("🚀 Generating your personalized travel itinerary... please wait a few seconds ⏳")

        try:
            # Create task instances
            loc_task = location_task(location_expert, from_city, destination_city, date_from, date_to)
            guid_task = guide_task(guide_expert, destination_city, interests, date_from, date_to)
            dest_task= destination_task(destination_agent,destination_city,budget,travelers)
            budg_task = budget_task(budget_agent,destination_city,budget,travelers)
            weather_tsk=weather_task(weather_agent,destination_city,date_from,date_to)
            transport_tsk = transport_task(transport_agent,from_city,destination_city)
            food_tsk = food_task(food_agent,destination_city,travelers)
            safety_tsk = safety_task(safety_agent,destination_city)
            packing_tsk = packing_task(packing_agent,destination_city,date_from,date_to,travelers)
            plan_task = planner_task([loc_task, guid_task, dest_task, budg_task, weather_tsk, food_tsk, transport_tsk, safety_tsk, packing_tsk], planner_expert, destination_city, interests, date_from, date_to, budget, travelers,)
            

            # Initialize Crew
            crew = Crew(
                agents=[location_expert, guide_expert,destination_agent,budget_agent, planner_expert, weather_agent, food_agent, transport_agent, safety_agent, packing_agent],
                tasks=[loc_task, guid_task,dest_task,budg_task,weather_tsk,food_tsk,transport_tsk,safety_tsk,packing_tsk, plan_task],
                
                full_output=True,
                verbose=True,
            )
                        
            # Run the crew
            result = crew.kickoff()

            # Display results
            st.success("✅ Your AI-generated travel plan is ready!")
            st.subheader(f"🗺️ {destination_city} Travel Plan")
            st.markdown(result if isinstance(result, str) else str(result))

            # Save and offer download
            file_name = f"TravelPlan_{destination_city.replace(' ', '_')}.md"
            st.download_button(
                label="📥 Download Itinerary (Markdown)",
                data=str(result),
                file_name=file_name,
                mime="text/markdown"
            )

        except Exception as e:  
            st.error(f"❌ Something went wrong: {e}")
