from crewai import Task


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
        async_execution=True
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
        async_execution=True
    )

#budget Expert
def budget_task(agent, destination_city, budget, travelers):
    return Task(
        description=f"""
        Create a realistic budget breakdown for traveling to **{destination_city}**
        for **{travelers} travelers**with a total budget of **${budget}**.

         Break down costs for:
        1. Accommodation (per night recommendations)
        2. Meals (budget to luxury options)
        3. Activities and attractions
        4. Transportation (local and inter-city)
        5. Emergency fund and miscellaneous

        Present in table format.
        """,
        expected_output="A clear budget breakdown table.",
        async_execution=True,
        agent=agent
        
    )

#destination Expert
def destination_task(agent, destination_city, budget, travelers):
    return Task(
        description=f"""
        As a **Destination Expert**, list:
        Include:

        1. Top attractions and their costs
        2. Local customs and etiquette
        3. Best areas to stay
        4. Language tips
        5. Cultural highlights

        City: **{destination_city}**
        for **{travelers} travelers** with a total budget of **${budget}**. 
        """,
        expected_output="A structured list of must-visit attractions.",
        async_execution=True,
        agent=agent
    )

# Weather Expert

def weather_task(agent, destination_city, date_from, date_to):
    return Task(
        description=f"""
        You are a **Travel Weather Analyst** providing climate insights for travelers visiting **{destination_city}**
        between **{date_from}** and **{date_to}**.

        🌦️ Provide practical weather information to help travelers prepare.

        Include:
        - Average temperature range
        - Rainfall probability
        - Humidity levels
        - Sunrise & sunset time
        - Seasonal conditions
        - Weather-related travel advice

        ✍️ Style:
        - Clear markdown formatting
        - Use bullet points
        - Provide simple advice for travelers

        Example sections:
        ## 🌡 Temperature
        ## 🌧 Rain Probability
        ## 👕 What to Wear
        ## 🌤 Travel Advice
        """,
        expected_output="A structured markdown weather report with travel advice.",
        async_execution=True,
        agent=agent
    )

# Food Expert

def food_task(agent, destination_city, travelers):
    return Task(
        description=f"""
        You are a **Food & Culinary Travel Expert** for **{destination_city}**.

        Your job is to recommend the best food experiences for **{travelers} travelers**.

        🍽 Include:
        - Famous local dishes
        - Top rated restaurants
        - Budget-friendly street food
        - Fine dining experiences
        - Local drinks or desserts

        Provide:
        - Restaurant name
        - Cuisine type
        - Average price
        - Short description

        Format in markdown sections:
        ## 🍜 Famous Local Dishes
        ## 🍴 Best Restaurants
        ## 🥙 Street Food
        """,
        expected_output="A markdown food guide including local dishes and recommended restaurants.",
        async_execution=True,
        agent=agent
    )

# Transportation Expert

def transport_task(agent, from_city, destination_city):
    return Task(
        description=f"""
        You are a **Transportation Planning Expert**.

        Provide detailed transport options from **{from_city}** to **{destination_city}** and within the destination city.

        🚆 Include:
        - Flights (approx duration and cost)
        - Train options
        - Bus routes
        - Car rental options
        - Airport transfer methods
        - Booking recommendations
        - Local transportation (metro, taxi, ride-hailing apps)

        ✍️ Format:
        - Use markdown tables when helpful
        - Include estimated prices and durations

        Example structure:
        ## ✈️ Flights
        ## 🚆 Trains
        ## 🚖 Local Transportation
        """,
        expected_output="A markdown transportation guide with travel options and estimated costs.",
        async_execution=True,
        agent=agent
    )

# Safety Expert

def safety_task(agent, destination_city):
    return Task(
        description=f"""
        You are a **Travel Safety Advisor** helping travelers stay safe in **{destination_city}**.

        🛡 Provide:
        1. General safety tips
        2. Areas to avoid
        3. Scams to watch out for
        4. Emergency numbers
        5. Healthcare facilities
        6. Insurance recommendations
        7. Local laws and customs
        8. LGBTQ+ safety if applicable
        9. Solo traveler tips

        Use markdown headings and short bullet points.

        Example sections:
        ## 🚨 Emergency Numbers
        ## ⚠️ Common Tourist Scams
        ## 🏨 Safe Areas to Stay
        ## 💡 Safety Tips
        """,
        expected_output="A markdown safety guide with practical travel safety advice.",
        async_execution=True,
        agent=agent
    )

# Packing Expert

def packing_task(agent, destination_city, date_from, date_to, travelers):
    return Task(
        description=f"""
        You are a **Travel Packing Specialist** preparing a packing checklist for travelers visiting **{destination_city}**
        between **{date_from}** and **{date_to}**.

        Travelers: **{travelers}**

        🎒 Create a practical packing list based on weather, activities, and travel duration.

        Include categories:
        - Clothing
        - Electronics
        - Travel documents
        - Toiletries
        - Health & safety items
        - Optional travel gear

        Format example:

        ## 👕 Clothing
        - Lightweight shirts
        - Comfortable walking shoes

        ## 📱 Electronics
        - Phone charger
        - Power bank

        ## 📄 Documents
        - Passport
        - Travel insurance
        """,
        expected_output="A structured markdown packing checklist for travelers.",
        async_execution=True,
        agent=agent
    )

# Travel Planner Expert

def planner_task(context, agent, destination_city, interests, date_from, date_to, budget, travelers):
    return Task(
        description=f"""
        You are an expert **Travel Itinerary Planner** creating a complete, seamless travel plan for **{destination_city}**.  
        You have received detailed inputs from:
        - The Travel Trip Expert (logistics, costs, weather, etc.)
        - The Local Guide Expert (experiences, food, attractions)

        🧠 Context: Use the findings and recommendations provided by all prior specialist agents in context.

        ✈️ Plan Details:
        - Trip dates: **{date_from} → {date_to}**
        - Travelers: **{travelers}**
        - Total Budget: **${budget}**
        - Traveler interests: **{interests}**

        ## 🎯 YOUR MISSION
        Synthesize all specialist reports into one **comprehensive, beautifully formatted travel itinerary** that's ready to share with the traveler.

        ## 📊 SPECIALIST INPUTS AVAILABLE
        You have received detailed reports from these specialists:
        1. **Location Expert** - Route planning and geographical insights
        2. **Tour Guide** - Activities and experiences matching interests
        3. **Destination Specialist** - Local attractions and cultural info
        4. **Budget Planner** - Cost breakdowns and money-saving tips
        5. **Weather Specialist** - Climate expectations and preparation
        6. **Transport Expert** - Getting there and getting around
        7. **Food Expert** - Culinary experiences and dining options
        8. **Safety Advisor** - Security tips and emergency info
        9. **Packing Specialist** - What to bring based on weather/activities

        ## 📝 REQUIRED OUTPUT STRUCTURE

        ### 1. 🏙️ EXECUTIVE SUMMARY
        - **Introduction (4-5 engaging paragraphs)**
          * Describe the city's unique character and vibe
          * Highlight what makes it special for {interests} enthusiasts
          * Set expectations for the trip
          * Mention seasonal highlights for {date_from} to {date_to}
        - **Trip Overview**
          * Quick facts: duration, travelers, total budget
          * Best time to visit specific attractions
        - **Budget Summary**
          * High-level cost breakdown by category
          * Value-for-money highlights

        ### 2. 🗓️ DAILY ITINERARY
        For each day, include:
        - **Morning (9am-12pm)**
          * Activity description with timing
          * Entrance fees/booking info
          * Pro tip for best experience
        - **Lunch (12pm-2pm)**
          * Recommended restaurants (budget-friendly to splurge)
          * Local cuisine to try
        - **Afternoon (2pm-5pm)**
          * Main activities
          * Travel time between locations
        - **Evening (6pm onwards)**
          * Dinner recommendations
          * Evening entertainment options
          * Nightlife/sunset spots
        - **Daily Summary**
          * Estimated daily cost
          * Walking distance/transport needs
          * Weather-appropriate tips

        ### 3. 💰 DETAILED BUDGET BREAKDOWN
        | Category | Budget | Mid-Range | Luxury | Notes |
        |----------|--------|-----------|---------|-------|
        | Accommodation | $X/night | $Y/night | $Z/night | Area recommendations |
        | Meals | $X/day | $Y/day | $Z/day | Cuisine types |
        | Activities | $X/day | $Y/day | $Z/day | Must-do vs optional |
        | Transport | $X total | $Y total | $Z total | Local transit vs taxis |
        | Souvenirs | $X total | $Y total | $Z total | What to buy |
        | Emergency | $X total | $Y total | $Z total | Buffer amount |

        ### 4. 🎒 PRACTICAL INFORMATION
        - **Accommodation Guide**
          * Best neighborhoods for {interests}
          * Hotel vs Airbnb vs Hostel recommendations
          * Booking tips and timing
        - **Getting Around**
          * Public transport passes vs taxis/rideshares
          * Walking zones and safety tips
          * Car rental considerations
        - **Local Customs & Etiquette**
          * Do's and don'ts
          * Tipping culture
          * Dress codes for attractions
        - **Connectivity**
          * SIM card/eSIM options
          * Free WiFi spots
          * Essential apps to download

        ### 5. ⚠️ CONTINGENCY PLANS
        - **Weather Backup Options**
          * Indoor activities for rainy days
          * Heat/cold wave alternatives
        - **Emergency Procedures**
          * Lost documents protocol
          * Medical emergency contacts
          * Embassy/consulate info
        - **Flexibility Options**
          * How to modify itinerary if tired
          * Last-minute booking alternatives

        ### 6. 📱 QUICK REFERENCE
        - **Packing Checklist** (based on weather: {date_from} to {date_to})
          * Essentials
          * Weather-specific items
          * Activity-specific gear
        - **Important Contacts**
          * Emergency numbers
          * Hospital locations
          * 24/7 pharmacies
        - **Must-Download Apps**
          * Navigation
          * Translation
          * Booking
          * Local transport
        - **Useful Phrases**
          * Greetings
          * Emergency phrases
          * Dining etiquette phrases

        ### 7. 🌟 INSIDER TIPS
        - Hidden gems not in typical guides
        - Best photo spots and timing
        - Local favorites off the tourist path
        - Money-saving secrets
        - Time-saving hacks

        ## 🎨 FORMATTING GUIDELINES
        - Use **Markdown** for clean formatting
        - Emojis for section headers (provided above)
        - Tables for budgets and comparisons
        - **Bold** for key information
        - *Italics* for tips and notes
        - Bullet points for lists
        - Line breaks between sections
        - Include estimated walking distances
        - Add ⏰ for timings and 💰 for costs

        ## ⚡ QUALITY CHECKLIST
        - [ ] All sections are complete and detailed
        - [ ] Information is accurate and practical
        - [ ] Tone is friendly and enthusiastic
        - [ ] No repetition or filler content
        - [ ] Budget aligns with traveler's ${budget} total
        - [ ] Activities match interests: {interests}
        - [ ] Appropriate for {travelers}
        - [ ] Weather-appropriate for {date_from} to {date_to}
        - [ ] Includes both popular spots and hidden gems
        - [ ] Has backup plans for contingencies

        ⚡ Output Goal:
        Deliver a polished, reader-friendly, markdown itinerary that combines creativity with accurate information and is ready to present to the traveler.
        """,
        expected_output="A complete, daily markdown travel itinerary with introduction, plan, budget, and tips.",
        context=context,
        agent=agent,
        output_file='travel_plan.md',
    )