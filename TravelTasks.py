from crewai import Task


# =====================================================================
# 4 STREAMLINED CORE TASKS (Compact Prompts, High Speed, Low Tokens)
# =====================================================================

def destination_task(agent, destination_city, interests, date_from, date_to):
    """Destination, Culture, Food, and Weather Analysis Task."""
    return Task(
        description=f"""
        Analyze travel highlights for **{destination_city}** from **{date_from}** to **{date_to}**.
        Traveler interests: **{interests}**.

        Deliver concise, actionable findings:
        1. 🌟 Top 4-5 attractions matching user interests (include vibe & estimated ticket/entry fees).
        2. 🍜 Must-try local dishes and 2-3 recommended dining spots (budget to mid-range).
        3. 🌤️ Weather expectations and seasonal advice for these travel dates.
        4. 💡 2-3 insider local tips or hidden gems.

        Keep response structured, concise, and formatted in clean Markdown without fluff.
        """,
        expected_output="A structured markdown report covering attractions, dining, weather, and insider tips.",
        agent=agent,
        output_file="destination_report.md",
        async_execution=True,
    )


def budget_transport_task(agent, from_city, destination_city, budget, travelers):
    """Transportation Logistics, Lodging, and Cost Breakdown Task."""
    return Task(
        description=f"""
        Calculate transportation and lodging estimates for **{travelers} travelers** visiting **{destination_city}** from **{from_city}** with a total budget of **${budget}**.

        Deliver practical estimates:
        1. ✈️ Inbound/Outbound Transit: Flight/train connectivity options, estimated durations, and price brackets.
        2. 🚖 Local Getting Around: Metro passes, taxis, or rideshare app advice.
        3. 🏨 Accommodation: Recommended neighborhoods and average nightly rates for Budget, Mid-range, and Luxury stays.
        4. 💰 Daily Spending Breakdown Table: Estimated daily cost per person for meals, transit, and activities within the ${budget} budget.
        """,
        expected_output="A structured markdown report with transit options, hotel price ranges, and a budget table.",
        agent=agent,
        output_file="budget_report.md",
        async_execution=True,
    )


def safety_prep_task(agent, destination_city, date_from, date_to, travelers):
    """Safety Advisories, Common Scams, and Packing Checklist Task."""
    return Task(
        description=f"""
        Prepare essential travel security guidance and packing preparation for **{travelers} travelers** visiting **{destination_city}** ({date_from} to {date_to}).

        Deliver:
        1. 🚨 Emergency Contacts: Police, ambulance, and tourist helpline numbers.
        2. ⚠️ Common Scams: 2-3 frequent tourist traps or scams and how to avoid them.
        3. 🏨 Safe Neighborhoods: Best safe areas to stay and zones to avoid at night.
        4. 🎒 Weather-Adapted Packing Checklist: Clothing, electronics (adapters/plugs), documents, and healthcare items.
        """,
        expected_output="A structured markdown safety advisory and essential packing checklist.",
        agent=agent,
        output_file="safety_report.md",
        async_execution=True,
    )


def planner_task(context, agent, destination_city, interests, date_from, date_to, budget, travelers):
    """Master Itinerary Synthesis Task - Compiles All Inputs Into A Cohesive Plan."""
    return Task(
        description=f"""
        Synthesize the specialist reports (Destination, Budget/Transit, and Safety) into a polished, comprehensive **Travel Itinerary** for **{destination_city}**.

        Trip Details:
        - Dates: **{date_from} to {date_to}**
        - Travelers: **{travelers}**
        - Total Budget: **${budget}**
        - Interests: **{interests}**

        Format the final plan with these clean Markdown sections:
        # 🌍 {destination_city} Complete Travel Itinerary

        ### 1. 🏙️ Trip Overview & Highlights
        - Quick summary of character, seasonal weather, and top themes.
        - High-level cost distribution within ${budget}.

        ### 2. 🗓️ Day-by-Day Itinerary
        For each day of the journey:
        - **Morning (9:00 AM - 12:30 PM):** Main attraction, entrance fee, and pro tip.
        - **Lunch (12:30 PM - 2:00 PM):** Recommended cuisine and dining spot.
        - **Afternoon (2:00 PM - 5:30 PM):** Sightseeing or cultural experience.
        - **Evening (6:00 PM onwards):** Dinner, sunset spot, or night market.

        ### 3. 💰 Budget & Lodging Breakdown
        - Summary table of estimated expenses (Lodging, Food, Activities, Local Transit).
        - Recommended hotels and neighborhood recommendations.

        ### 4. 🧳 Practical Essentials & Safety
        - Key emergency contacts and scam prevention rules.
        - Checklist of must-pack items and local currency/payment tips.

        Write in an inspiring, professional, and practical tone. Avoid repetitive filler.
        """,
        expected_output="A complete, day-by-day markdown travel plan with budget table, lodging, and safety checklist.",
        context=context,
        agent=agent,
        output_file="travel_plan.md",
    )


# =====================================================================
# BACKWARD COMPATIBILITY WRAPPERS (Preserves Legacy Signatures)
# =====================================================================

def location_task(agent, from_city, destination_city, date_from, date_to):
    return destination_task(agent, destination_city, "General sightseeing", date_from, date_to)

def guide_task(agent, destination_city, interests, date_from, date_to):
    return destination_task(agent, destination_city, interests, date_from, date_to)

def food_task(agent, destination_city, travelers):
    return destination_task(agent, destination_city, "Food and dining", "upcoming", "dates")

def weather_task(agent, destination_city, date_from, date_to):
    return destination_task(agent, destination_city, "Weather overview", date_from, date_to)

def transport_task(agent, from_city, destination_city):
    return budget_transport_task(agent, from_city, destination_city, "Flexible", "1")

def budget_task(agent, destination_city, budget, travelers):
    return budget_transport_task(agent, "Origin", destination_city, budget, travelers)

def safety_task(agent, destination_city):
    return safety_prep_task(agent, destination_city, "Flexible", "Flexible", "1")

def packing_task(agent, destination_city, date_from, date_to, travelers):
    return safety_prep_task(agent, destination_city, date_from, date_to, travelers)
