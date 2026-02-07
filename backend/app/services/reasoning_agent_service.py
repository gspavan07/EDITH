import os
import requests
import logging
from bs4 import BeautifulSoup
from typing import List
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

class ReasoningAgentService:
    def __init__(self):
        # Initialize the LLM for the reasoning agent
        # Using Groq with OpenAI-compatible API if possible, or fallback to direct OpenAI
        api_key = settings.GROQ_API_KEY or settings.OPENAI_API_KEY
        base_url = "https://api.groq.com/openai/v1/" if settings.GROQ_API_KEY else "https://api.openai.com/v1/"
        model_name = "llama-3.3-70b-versatile" if settings.GROQ_API_KEY else "gpt-4o"
        
        self.llm = ChatOpenAI(
            api_key=api_key,
            model_name=model_name,
            temperature=0,
            base_url=base_url
        )

    def _get_retriever_tool(self, doc_text: str):
        """Creates a tool to search specifically within the provided manual/document."""
        from app.services.vector_store_service import VectorStoreService
        
        # Temp local index for this specific document
        temp_vs = VectorStoreService(index_dir="agent_data/temp_index")
        temp_vs.add_documents([doc_text], {"filename": "mission_document", "path": "memory"})
        
        @tool
        def document_retriever(query: str) -> str:
            """Search and retrieve relevant instructions or details from the mission document."""
            results = temp_vs.search(query, k=5)
            return "\n\n".join([r['text'] for r in results])
        
        return document_retriever

    @tool
    def web_scraper_tool(url: str) -> str:
        """
        Fetches text content from a URL or API. 
        Use this when a document instructs you to check an external source or link.
        """
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            if 'application/json' in response.headers.get('Content-Type', ''):
                return str(response.json())
            
            soup = BeautifulSoup(response.text, 'html.parser')
            # Extract main content
            for script in soup(["script", "style"]):
                script.decompose()
            return soup.get_text(separator=' ', strip=True)[:5000]
        except Exception as e:
            return f"Error fetching URL {url}: {e}"

    async def run_mission(self, document_context: str, mission_query: str) -> str:
        """Starts a reasoning mission using the document as a guide."""
        try:
            retriever = self._get_retriever_tool(document_context)
            tools = [retriever, self.web_scraper_tool]
            
            agent = create_react_agent(self.llm, tools)
            
            system_prompt = (
                "You are an Elite Reasoning Agent. You have been given a MISSION and a MISSION DOCUMENT.\n"
                "1. Use `document_retriever` to find specific steps or links in the document.\n"
                "2. If you find links/URLs that need checking, use `web_scraper_tool`.\n"
                "3. Reason across findings to answer the MISSION query precisely."
            )
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Mission Document is loaded. Mission: {mission_query}")
            ]
            
            result = await agent.ainvoke({"messages": messages})
            return result["messages"][-1].content
        except Exception as e:
            logger.error(f"Reasoning Mission Failed: {e}")
            return f"Mission Failure: {str(e)}"
