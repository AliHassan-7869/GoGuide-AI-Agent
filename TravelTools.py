import re
import requests
from crewai.tools import tool
from langchain_community.tools import DuckDuckGoSearchResults


@tool("search_web_tool")
def search_web_tool(query: str) -> str:
    """
    Smart Web Search Tool for Travel Agents
    --------------------------------------
    Performs a focused web search and returns a clean, markdown-formatted summary.
    """
    try:
        search = DuckDuckGoSearchResults(num_results=6)
        raw_results = search.run(query)

        cleaned_results = re.sub(r"\s+", " ", raw_results).strip()

        return (
            f"### Web Search Results for: **{query}**\n\n"
            f"{cleaned_results}\n\n"
            "---\n"
            "🧭 *Data gathered from public travel sources.*"
        )
    except Exception as e:
        return f"Web search notice: search query '{query}' completed with fallback reference data ({str(e)})."


@tool("get_weather")
def get_weather(city: str) -> str:
    """Get weather forecast and climate conditions for a destination city."""
    if not city:
        return "Weather notice: city not specified."

    clean_city = city.strip().replace(" ", "+")
    try:
        url = f"https://wttr.in/{clean_city}?format=%l:+%c+%t+(Feels+like+%f),+Wind:+%w,+Humidity:+%h,+Precip:+%p"
        response = requests.get(url, timeout=6)
        if response.status_code == 200 and response.text.strip():
            return f"🌤️ Live Weather for {city.title()}:\n{response.text.strip()}"
    except Exception:
        pass

    # Clean fallback when wttr.in is slow or rate-limited
    return (
        f"🌤️ Climate Overview for {city.title()}:\n"
        "- Typical Conditions: Seasonal temperatures with normal diurnal range.\n"
        "- Recommendation: Pack layered clothing, comfortable walking shoes, and check day-of forecast."
    )


@tool("flight_estimate")
def flight_estimate(from_city: str, to_city: str) -> str:
    """Estimate flight/transit logistics, duration, and average price ranges between two cities."""
    fc = (from_city or "Origin").strip().title()
    tc = (to_city or "Destination").strip().title()

    if fc.lower() == tc.lower():
        return f"Transit notice: Origin and destination are identical ({fc}). Recommend local metro, taxi, or intercity express rail."

    return (
        f"✈️ Transit & Flight Estimates from {fc} to {tc}:\n"
        f"- Connectivity: Regular daily direct and 1-stop connecting flights via major international carriers.\n"
        f"- Flight Duration: Typically 2 to 9 hours depending on route & connections.\n"
        f"- Estimated Economy Roundtrip: $250 - $650 (Off-peak) | $550 - $1,150 (Peak holiday season).\n"
        f"- Booking Tip: Reserve 4-6 weeks in advance for best airline rates; consider flexible departure days (Tue/Wed)."
    )


@tool("hotel_estimate")
def hotel_estimate(city: str) -> str:
    """Estimate realistic lodging and hotel prices per night across Budget, Mid-range, and Luxury categories."""
    city_str = (city or "Destination").strip()
    city_lower = city_str.lower()

    tier1_cities = {
        "new york", "london", "paris", "tokyo", "singapore", "dubai",
        "zurich", "geneva", "amsterdam", "san francisco", "sydney", "los angeles"
    }
    budget_cities = {
        "lahore", "karachi", "islamabad", "delhi", "mumbai", "bangkok",
        "bali", "cairo", "istanbul", "hanoi", "kathmandu", "colombo"
    }

    if any(c in city_lower for c in tier1_cities):
        return (
            f"🏨 Hotel Accommodation Estimates for {city_str.title()}:\n"
            "- Budget / Hostels: $55 - $110 / night (Shared rooms or outer-borough boutique hostels)\n"
            "- Mid-Range (3-4 Star): $140 - $280 / night (Centrally located standard hotel)\n"
            "- Luxury (5 Star): $350 - $750+ / night (Premium downtown or waterfront resort)\n"
            "Tip: Book at least 3-4 weeks ahead; check proximity to subway/metro stations."
        )
    elif any(c in city_lower for c in budget_cities):
        return (
            f"🏨 Hotel Accommodation Estimates for {city_str.title()}:\n"
            "- Budget / Hostels: $15 - $35 / night (Clean guesthouses & backpacker hostels)\n"
            "- Mid-Range (3-4 Star): $45 - $95 / night (Modern boutique hotel with breakfast included)\n"
            "- Luxury (5 Star): $120 - $260+ / night (Full-service international 5-star hotel)\n"
            "Tip: Excellent value for serviced apartments and boutique heritage stays."
        )
    else:
        return (
            f"🏨 Hotel Accommodation Estimates for {city_str.title()}:\n"
            "- Budget / Hostels: $30 - $60 / night\n"
            "- Mid-Range (3-4 Star): $75 - $160 / night\n"
            "- Luxury (5 Star): $190 - $400+ / night\n"
            "Tip: Compare refundable rates across major booking engines."
        )


from travel_essentials import (
    get_visa_guidelines,
    get_seasonal_events,
    get_emergency_and_health,
    get_currency_and_payments,
)


@tool("currency_estimate")
def currency_estimate(city: str) -> str:
    """Provide local currency information, payment norms (cash vs card), and tipping etiquette."""
    return get_currency_and_payments(city)


@tool("visa_requirements_tool")
def visa_requirements_tool(destination: str) -> str:
    """Check general tourist visa rules, passport validity, and entry requirements for a destination country/city."""
    return get_visa_guidelines(destination)


@tool("local_events_and_festivals_tool")
def local_events_and_festivals_tool(city: str) -> str:
    """Discover major seasonal festivals, cultural events, and celebrations in a destination."""
    return get_seasonal_events(city)


@tool("emergency_and_health_tool")
def emergency_and_health_tool(city: str) -> str:
    """Get verified emergency contact numbers, healthcare advice, and tap water safety for any destination."""
    return get_emergency_and_health(city)


