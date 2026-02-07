import os
import httpx
import json
from typing import List, Dict
from app.core.config import settings

class PlannerService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model_id = "openai/gpt-oss-safeguard-20b"
        
        self.system_prompt = (
            "You are the Strategic Planner for EDITH. "
            "Break down user requests into discrete, logical steps. "
            "You have access to the following tools:\n"
            "- google_search(query): Search the web for real-time info.\n"
            "- browse_url(url): Read website content for analysis.\n"
            "- write_file(filename, content): Save data locally.\n"
            "- index_agent_files(): MANDATORY step to sync local files for analysis (V3.0 Core).\n"
            "- ask_document(question): Answer questions based on indexed docs via Semantic Search (V3.0 RAG).\n"
            "- reason_over_mission(filename, mission): Advanced strategy analysis for complex missions (V3.0 Reasoning).\n"
            "- analyze_data(filename, query): Analyze CSV/Excel files using Pandas.\n"
            "- draft_email(recipient, subject, body): Draft email and show preview for approval.\n"
            "- confirm_send_email(confirmed): Send the drafted email after user confirms.\n"
            "- schedule_task(task_description, interval_seconds): Schedule a recurring task.\n"
            "- list_scheduled_tasks(): Show all active scheduled jobs.\n"
            "- read_email(limit): Fetch unread emails from inbox.\n"
            "\n"
            "**AUTOMATION RULES:**\n"
            "If the user wants to schedule/automate something (e.g. 'every 5 mins'), YOU MUST:\n"
            "1. PLAN to use the 'schedule_task' tool.\n"
            "2. Do NOT suggest manual steps.\n"
            "3. Calculate the interval in seconds (e.g. 1 hour = 3600).\n"
            "\n"
            "You MUST output ONLY a valid JSON object:\n"
            "{\n"
            "  \"reasoning\": \"Explain why you chose these steps.\",\n"
            "  \"steps\": [\"Step 1...\", \"Step 2...\"]\n"
            "}"
        )

    async def generate_plan(self, user_input: str) -> Dict:
        """
        Generates a step-by-step plan for a complex task.
        """
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "model": self.model_id,
                    "messages": [
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": f"User Request: \"{user_input}\""}
                    ],
                    "temperature": 0.0,
                }
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(self.base_url, json=payload, headers=headers)
                if response.status_code != 200:
                    raise Exception(f"Planner API Error: {response.text}")
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Clean markdown if present
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                return json.loads(content)
        except Exception as e:
            print(f"Planning Error: {e}")
            return {
                "reasoning": "Defaulting to direct execution due to planning error.",
                "steps": [user_input]
            }

planner_service = PlannerService()
