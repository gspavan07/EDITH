import requests
import logging
import os
from typing import List
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

load_dotenv(override=True)

# Create logs directory
os.makedirs("logs", exist_ok=True)

# Configure logging for api_details.log
detail_logger = logging.getLogger("api_details")
if not detail_logger.handlers:
    detail_logger.setLevel(logging.INFO)
    detail_handler = logging.FileHandler("logs/api_details.log")
    detail_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
    detail_logger.addHandler(detail_handler)
    detail_logger.propagate = False

llm = ChatOpenAI(api_key=os.getenv("GROQ_API_KEY"),
                 model_name="openai/gpt-oss-20b",
                 temperature=0,
                 base_url="https://api.groq.com/openai/v1/",
                 streaming=True)
import numpy as np
from.embeddings import get_embeddings, build_faiss_index
from .document_parser import parse_pdf

def retriever_tool(doc_url: str):
    """Factory function that creates a retriever tool for a specific document"""
    
    # Parse the document and build index
    pages = parse_pdf(doc_url)
    if not pages:
        raise ValueError("Could not parse document")
    
    chunk_embeddings = get_embeddings(tuple(pages))
    if chunk_embeddings is None:
        raise ValueError("Failed to generate embeddings")
    
    index = build_faiss_index(chunk_embeddings)
    
    @tool
    def document_retriever(query: str) -> str:
        """Search and retrieve relevant information from the loaded document"""
        try:
            q_embeddings = get_embeddings((query,))
            if q_embeddings is None:
                return "Unable to process query"
            
            q_embed = q_embeddings[0]
            D, I = index.search(np.array([q_embed]), k=5)
            relevant_chunks = [pages[i] for i in I[0]]
            
            return "\n\n".join(relevant_chunks)
        except Exception as e:
            return f"Error retrieving information: {e}"
    
    return document_retriever

@tool
def web_scraper_tool(url: str) -> str:
    """
    Fetches the complete text content from a given web URL or API endpoint.
    Use this tool to get data from external sources as instructed by the mission document.
    """
    print(f"\n--- TOOL: Web Scraper ---")
    print(f"Fetching content from: {url}")
    try:
        if url.lower().endswith('.pdf'):
            from .document_parser import parse_pdf
            pages = parse_pdf(url)
            return " ".join(pages) if pages else "No text content found in PDF."
        
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()

        content_type = response.headers.get('Content-Type', '')
        if 'application/pdf' in content_type:
            from .document_parser import parse_pdf
            pages = parse_pdf(url)
            return " ".join(pages) if pages else "No text content found in PDF."
        elif 'application/json' in content_type:
            json_data = response.json()
            
            # Log response
            detail_logger.info(f"{json_data}")
            
            return str(json_data)
        else:
            soup = BeautifulSoup(response.text, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
            
            # Log flight response text
            flight_response_text = text
            detail_logger.info(f"flight response: {flight_response_text}")
            
            return text if text else "Successfully fetched URL, but no text content was found."

    except Exception as e:
        return f"Error: Could not fetch the URL. {e}"

AGENT_SYSTEM_PROMPT = """You are a highly specialized reasoning agent. Your mission is to follow instructions from a given document to find a final answer.
**Your Workflow:**
1. Use the `document_retriever` tool to search the loaded instruction document.
2. Analyze the instructions to understand the objective and steps.
3. For each step that requires fetching external data, use the `web_scraper_tool` with the URLs mentioned in the instructions.
4. Reason and combine the information to find the final answer.

[Important]
Keep Final answer Formate similar to: "Your flight number to "[city (to where the flight is going)]" is: "flightnumber"" (dont bold the number.)
eg: if response id {'success': True, 'message': 'Mumbai flight number generated successfully', 'status': 200, 'data': {'flightNumber': '3c9fbb'}} the [city] will be Mumbai.

**Critical Instructions:**
* Do not guess. Rely *only* on the information from your tools.
* Use document_retriever for searching the instruction document.
* Use web_scraper_tool for external URLs and APIs.
"""


async def reasoning_agent(url: str, query: str) -> List[str]:
    # Create retriever tool for the document
    try:
        instruction_retriever = retriever_tool(url)
        tools = [instruction_retriever, web_scraper_tool]
    except Exception as e:
        # Fallback to just web scraper if retriever fails
        tools = [web_scraper_tool]
    
    agent_executor = create_react_agent(llm, tools)

    print(f"{'='*20} Agent Initialized. Starting Task. {'='*20}\n")
    
    messages = [
        SystemMessage(content=AGENT_SYSTEM_PROMPT),
        HumanMessage(
            content=f"The instruction document is loaded. Use document_retriever to search it and web_scraper_tool for external URLs. Mission: {query}"
        )
    ]
    result = await agent_executor.ainvoke({"messages": messages})

    return result["messages"][-1].content
