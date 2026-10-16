from crewai.tools import tool
from langchain_community.tools import DuckDuckGoSearchResults
import re
import requests


@tool("search_web_tool")
def search_web_tool(query: str) -> str:
    """
    🌍 Smart Web Search Tool for Travel Agents
    -------------------------------------------------------
    Performs a focused DuckDuckGo web search and returns
    a clean, markdown-formatted summary of the top results.

    Ideal for tasks such as:
    - Finding local attractions or restaurants
    - Checking visa, safety, or cultural info
    - Getting weather updates or upcoming events
    - Researching transportation or costs

    Args:
        query (str): The travel-related search query.

    Returns:
        str: A markdown-formatted, cleaned summary of results,
             ready for use by CrewAI or LLM-based agents.
    """
    try:
        # Initialize DuckDuckGo search (10 results by default)
        search = DuckDuckGoSearchResults(num_results=10)
        raw_results = search.run(query)

        # Clean up any noisy formatting or whitespace
        cleaned_results = re.sub(r"\s+", " ", raw_results).strip()

        # Prepare markdown-friendly output
        formatted_output = (
            f"### 🔍 Web Search Results for: **{query}**\n\n"
            f"{cleaned_results}\n\n"
            "---\n"
            "🧭 *Note: Data gathered from DuckDuckGo public sources. "
            "Verify critical details (flights, visa, safety) via official websites.*"
        )

        return formatted_output

    except Exception as e:
        return f"⚠️ [ERROR] Web search failed for '{query}': {str(e)}"

@tool
def get_weather(city: str):
    """Get weather forecast"""
    url = f"https://wttr.in/{city}?format=3"
    response = requests.get(url)
    return response.text


@tool
def flight_estimate(from_city: str, to_city: str):
    """Estimate flight info"""
    return f"Flights operate between {from_city} and {to_city}. Average travel time 4-8 hours."


@tool
def hotel_estimate(city: str):
    """Estimate hotel prices"""
    return f"Average hotel price in {city} ranges between $80 - $250 per night."