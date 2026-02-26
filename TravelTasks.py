from crewai import Task

def requirement_analysis_task(agent, user_input):
    return Task(
        description=f"""
        You are an **AI Travel Requirement Analyst**.

        Analyze the following user request:
        {user_input}

        Your responsibilities:
        - Clarify travel intent
        - Identify constraints (budget, time, interests)
        - Detect missing or ambiguous information
        - Summarize travel goals clearly

        Output:
        - A clean, structured summary of user requirements
        - Any assumptions made (if needed)
        """,
        expected_output="A structured summary of user travel requirements.",
        agent=agent
    )
# Location Expert
def location_task(agent, from_city, destination_city, date_from, date_to):
    return Task(
        description=f"""
        You are a **Travel Logistics Expert** helping a traveler plan a journey from **{from_city}** to **{destination_city}** 
        between **{date_from}** and **{date_to}**.

        Your job is to collect and present accurate, up-to-date travel logistics information.
        Be factual, practical, and user-friendly — imagine writing for a traveler who’s preparing their trip.

        🧳 Include:
        - Transportation options (flight, train, bus, car, etc.) with approximate durations and costs
        - Visa or entry requirements (if applicable)
        - Typical weather and temperature range
        - Accommodation types and average prices
        - Local currency and exchange rate info
        - Health and safety tips (if needed)
        - Cultural or etiquette notes
        - Major events or festivals during that time (if any)

        ✍️ Style:
        - Write in **friendly, simple English**
        - Use **Markdown formatting** (headers, bullet points, tables when relevant)
        - Use emoji icons sparingly to highlight sections
        - Always keep responses travel-focused and useful

        🧠 Output Goal:
        Produce a **detailed markdown travel logistics report** that would help a traveler prepare before arriving.

        🌐 Data Context:
        Use any general world knowledge or public data relevant to the cities.
        """,
        expected_output="A detailed markdown travel report including transportation, lodging, weather, and practical travel insights.",
        agent=agent,
        output_file='city_report.md',
    )


# Local Guide Expert
def guide_task(agent, destination_city, interests, date_from, date_to):
    return Task(
        description=f"""
        You are a **Local City Guide Expert** for **{destination_city}**.  
        The traveler is visiting from **{date_from}** to **{date_to}**, with interests in: **{interests}**.

        🧭 Your mission:
        Build a friendly, engaging, and realistic travel guide for this visitor.

        🎯 Focus On:
        - Top attractions (famous sites, nature, museums)
        - Unique local experiences
        - Food & restaurants based on the traveler’s interests
        - Nightlife or cultural events during that period
        - Local etiquette, safety, and useful apps
        - Hidden gems only locals know

        🧠 Personality:
        - Speak like a passionate, knowledgeable local guide.
        - Be **enthusiastic and story-like**, but still practical.
        - Use Markdown headings for each section.
        - Include short lists of must-try foods, sights, and neighborhoods.

        ✍️ Example structure:
        ```
        ## 🌆 Overview
        ...
        ## 🍜 Food & Dining
        ...
        ## 🎨 Culture & Attractions
        ...
        ## 💡 Insider Tips
        ...
        ```

        ⚡ Goal:
        Produce a lively, markdown-formatted city guide that inspires and informs travelers.
        """,
        expected_output="A friendly, markdown-based city travel guide tailored to traveler interests and visit dates.",
        agent=agent,
        output_file='guide_report.md',
    )


# Travel Planner Expert
def planner_task(context, agent, destination_city, interests, date_from, date_to):
    return Task(
        description=f"""
        You are an expert **Travel Itinerary Planner** creating a complete, seamless travel plan for **{destination_city}**.  
        You have received detailed inputs from:
        - The Travel Trip Expert (logistics, costs, weather, etc.)
        - The Local Guide Expert (experiences, food, attractions)

        Use their reports (provided in context) to create a **unified, daily travel itinerary**.

        🧠 Context: {context}

        ✈️ Plan Details:
        - Trip dates: **{date_from} → {date_to}**
        - Traveler interests: **{interests}**

        🎯 Deliverables:
        Create a **markdown-formatted travel itinerary** that includes:
        1. **Introduction (5–6 short paragraphs)** — Describe the city vibe, travel highlights, and what makes it special.
        2. **Day-by-day plan** (Morning / Afternoon / Evening structure)
        3. **Transport and timing suggestions** for each day (use tables or bullet points)
        4. **Approximate expenses** (budget, midrange, luxury)
        5. **Final section: Travel Tips & Packing Recommendations**

        💬 Tone:
        - Friendly, warm, and well-organized
        - Avoid repetition; merge and summarize insights smartly
        - Use emojis for section headers to improve readability
        - Be helpful and concise (no unnecessary filler)

        🧭 Example output structure:
        ```
        # 🌍 Paris 5-Day Itinerary

        ## 🏙️ Introduction
        ...

        ## 🗓️ Day 1: Arrival & City Orientation
        ...

        ## 🍽️ Day 2: Culture, Food, and Nightlife
        ...

        ## 💰 Budget Overview
        | Category | Estimated Cost |
        |-----------|----------------|
        | Lodging | $120/night |
        | Meals | $50/day |
        ...

        ## 🎒 Travel Tips
        ...
        ```

        ⚡ Output Goal:
        Deliver a polished, reader-friendly, markdown itinerary that combines creativity with accurate information and is ready to present to the traveler.
        """,
        expected_output="A complete, daily markdown travel itinerary with introduction, plan, budget, and tips.",
        context=context,
        agent=agent,
        output_file='travel_plan.md',
    )
def budget_task(agent, destination_city, budget, travelers):
    return Task(
        description=f"""
        Create a realistic budget breakdown for traveling to **{destination_city}**
        for **{travelers} travelers**with a total budget of **${budget}**.

        Include:
        - Transport
        - Accommodation (budget / mid / luxury)
        - Food
        - Activities
        - Daily estimated cost

        Present in table format.
        """,
        expected_output="A clear budget breakdown table.",
        agent=agent
    )
def destination_task(agent, destination_city, budget, travelers):
    return Task(
        description=f"""
        As a **Destination Expert**, list:
        - Top attractions
        - Natural & cultural landmarks
        - Best time of day to visit each place

        City: **{destination_city}**
        for **{travelers} travelers** with a total budget of **${budget}**. 
        """,
        expected_output="A structured list of must-visit attractions.",
        agent=agent
    )

def validation_task(agent):
    return Task(
        description="""
        Review the full travel plan and:
        - Check logical consistency
        - Ensure feasibility
        - Improve clarity and structure
        - Remove redundancy

        Provide a refined final version.
        """,
        expected_output="A validated and refined final travel plan.",
        agent=agent
    )