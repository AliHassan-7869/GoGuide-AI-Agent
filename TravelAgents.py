from crewai import Agent
from TravelTools import search_web_tool
from crewai import LLM
from langchain_ollama.llms import OllamaLLM
import sqlite3
import os



##os.environ["GROQ_API_KEY"] = "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"
os.environ["OPENROUTER_API_KEY"]="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"

# Initialize the blazing-fast Groq LLM
fast_llm = LLM(
    model="groq/groq/llama-3.3-70b-versatile",
    temperature=0.7 # Adds a bit of creativity to the travel plans
)
# Agents
destination_agent = Agent(
    role="Destination Expert",
    goal="Suggest best attractions and places to visit",
    backstory="You are a professional travel destination expert.",
    tools=[search_web_tool],  
    verbose=True,
    max_iter=3,
    llm=fast_llm,
    allow_delegation=False,
)

budget_agent = Agent(
    role="Budget Planner",
    goal="Optimize travel within user budget",
    backstory="You are a budget optimization expert for travelers.",
    tools=[search_web_tool],  
    verbose=True,
    max_iter=3,
    llm=fast_llm,
    allow_delegation=False,
)
location_expert = Agent(
role="Travel Trip Expert",
    goal="Provides travel logistics and essential information.",
    backstory="A seasoned traveler who knows everything about different cities.",
    tools=[search_web_tool],  
    verbose=True,
    max_iter=3,
    llm=fast_llm,  
    allow_delegation=False,
)

guide_expert = Agent(
    role="City Local Guide Expert",
    goal="Provides information on things to do in the city based on user interests.",
    backstory="A local expert passionate about sharing city experiences.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=3,
    llm=fast_llm,
    allow_delegation=False,
)

planner_expert = Agent(
    role="Travel Planning Expert",
    goal="Compiles all gathered information to create a travel plan.",
    backstory="An expert in planning seamless travel itineraries.",
    tools=[search_web_tool],
    verbose=True,
    max_iter=3,
    llm=fast_llm,
    allow_delegation=False,
)

