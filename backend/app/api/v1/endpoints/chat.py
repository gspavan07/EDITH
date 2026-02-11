from fastapi import APIRouter, HTTPException
from app.services.llm_service import llm_service
from app.services.intent_service import intent_detector
from app.services.mcp_service import mcp_service
from app.services.planner_service import planner_service
from pydantic import BaseModel
from typing import List, Optional, Any
import json

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    response: str
    intent: str
    actions: List[str] = []

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # 1. Intent Detection
    try:
        intent_data = await intent_detector.detect(request.message)
    except Exception as e:
        intent_data = {"intent": "CHAT", "reason": f"Detector Error: {str(e)}"}
    
    intent = intent_data.get("intent", "CHAT")

    # 2. Planning (Phase 7)
    plan_data = None
    if intent in ["TASK", "HYBRID"]:
        try:
            plan_data = await planner_service.generate_plan(request.message)
        except Exception as e:
            print(f"Planning failed: {e}")
            plan_data = {"reasoning": "Direct execution due to planning failure.", "steps": [request.message]}

    # Audit logging removed (was SQLite-based)

    # 4. History Handling (from request only - Supabase handles persistence)
    conversation_history = request.history.copy() if request.history else []
    
    # Inject Plan if available
    context_instruction = llm_service.system_instruction
    if plan_data:
        context_instruction += f"\n\nCURRENT TASK PLAN:\n{json.dumps(plan_data['steps'], indent=2)}"

    # Add user message
    conversation_history.append({"role": "user", "parts": [{"text": request.message}]})
    
    actions_taken = []
    final_response = ""
    max_iterations = 12
    tool_defs = mcp_service.get_tool_definitions()
    print(f"DEBUG TOOLS: {json.dumps(tool_defs, indent=2)}")

    for i in range(max_iterations):
        try:
            # Ask LLM
            llm_raw = await llm_service.get_raw_response(
                user_input="", 
                history=conversation_history,
                tools=tool_defs
            )

            choice = llm_raw["choices"][0]
            message = choice["message"]
            
            # Record assistant msg
            assistant_parts = []
            if message.get("content"):
                assistant_parts.append({"text": message["content"]})
            
            tool_calls = message.get("tool_calls", [])
            for tc in tool_calls:
                # Wrap argument parsing in safety
                try:
                    args = json.loads(tc["function"]["arguments"])
                except:
                    args = {"raw": tc["function"]["arguments"]}
                    
                assistant_parts.append({
                    "function_call": {
                        "id": tc["id"],
                        "name": tc["function"]["name"],
                        "args": args
                    }
                })

            conversation_history.append({"role": "model", "parts": assistant_parts})

            if tool_calls:
                for tc in tool_calls:
                    fn_name = tc["function"]["name"]
                    tc_id = tc["id"]
                    
                    try:
                        fn_args = json.loads(tc["function"]["arguments"])
                    except:
                        fn_args = {}

                    actions_taken.append(f"Action: {fn_name}")

                    # Execute tool with safety
                    try:
                        tool_result = await mcp_service.execute_tool(fn_name, fn_args)
                    except Exception as tool_err:
                        tool_result = f"Error executing tool: {str(tool_err)}"
                        print(f"Tool Error: {tool_err}")

                    # Add result
                    conversation_history.append({
                        "role": "tool", 
                        "parts": [{
                            "function_response": {
                                "id": tc_id,
                                "name": fn_name,
                                "response": {"result": tool_result}
                            }
                        }]
                    })
            else:
                final_response = message.get("content") or "I've completed the task as requested."
                break
        except Exception as e:
            print(f"Agent Loop Error: {e}")
            final_response = f"I encountered an internal error: {str(e)}. Please check my process log."
            break
    
    if not final_response:
        # If we hit the limit, try one last call to synthesize what we have
        try:
            conversation_history.append({"role": "user", "parts": [{"text": "You have reached your maximum action limit. Please provide a concise summary of what you have accomplished or found so far based on the tool results above."}]})
            llm_raw = await llm_service.get_raw_response(
                user_input="", 
                history=conversation_history,
                tools=tool_defs
            )
            final_response = llm_raw["choices"][0]["message"].get("content") or "I've reached my process limit. Please check the logs for the data gathered."
        except:
            final_response = "I ran out of reasoning steps (max iterations reached). Here is what I found so far. Check the log for details."

    # Logging removed (was SQLite-based)

    return ChatResponse(
        response=final_response,
        intent=intent,
        actions=actions_taken
    )
