from crewai import Agent
from TravelTools import search_web_tool
from crewai import LLM
import sqlite3
import os

os.environ["DEEPSEEK_API_KEY"]="sk-6f0046c42b964672b15da81d71a90c77"
os.environ["DEEPSEEK_API_BASE"] = "https://api.deepseek.com"


fast_llm = LLM(
    model="deepseek-chat",                
    base_url=os.environ["DEEPSEEK_API_BASE"],
    api_key=os.environ["DEEPSEEK_API_KEY"], 
    temperature=0.5,
)

#Agents:

planner_expert = Agent(
    role="Travel Planning Expert",
    goal="Compiles all gathered information to create a travel plan.",
    backstory="An expert in planning seamless travel itineraries,You must always respond with detailed, structured, step-by-step explanations.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

location_expert = Agent(
    role="Travel Trip Expert",
    goal="Provides travel logistics and essential information.",
    backstory="A seasoned traveler who knows everything about different cities,You must always respond with detailed, structured, step-by-step explanations.",
    tools=[search_web_tool],  
    verbose=True,
    max_iter=2,
    llm=fast_llm,  
    allow_delegation=False,
)

destination_agent = Agent(
    role="Destination Expert",
    goal="Suggest best attractions and places to visit",
    backstory="You are a professional travel destination expert, You must always respond with detailed, structured, step-by-step explanations.",
    tools=[search_web_tool],  
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

guide_expert = Agent(
    role="City Local Guide Expert",
    goal="Provides information on things to do in the city based on user interests.",
    backstory="A local expert passionate about sharing city experiences,You must always respond with detailed, structured, step-by-step explanations.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

weather_agent = Agent(
    role="Weather Forecast Expert",
    goal="Provide accurate weather forecast for travel dates and suggest best time to visit",
    backstory="You are a weather expert that helps travelers plan trips according to weather conditions. Always give temperature, rain probability and travel advice.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

food_agent = Agent(
    role="Food and Restaurant Expert",
    goal="Suggest famous foods and best restaurants in the destination",
    backstory="You are a food travel expert who knows famous local dishes and best restaurants for travelers.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

transport_agent = Agent(
    role="Transportation Expert",
    goal="Provide transport options such as flights, trains, buses, taxis and local transport",
    backstory="You are an expert in transportation logistics helping travelers move efficiently between locations.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

budget_agent = Agent(
    role="Budget Planner",
    goal="Optimize travel within user budget like list of average hotels & food cost ",
    backstory="You are strict budget optimization expert for travelers,You must always respond with detailed, structured, step-by-step explanations.",
    tools=[search_web_tool],  
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)


safety_agent = Agent(
    role="Travel Safety Advisor",
    goal="Provide safety tips, scams to avoid, and travel precautions",
    backstory="You are a travel safety expert helping tourists stay safe in foreign cities.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)

packing_agent = Agent(
    role="Packing Assistant",
    goal="Suggest packing list based on destination weather and trip type",
    backstory="You are a travel packing expert helping tourists pack efficiently for their trips.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=2,
    llm=fast_llm,
    allow_delegation=False,
)
