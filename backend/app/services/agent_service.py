import json
from typing import List, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
from app.mcp.tools import MCPTools
from app.services.pii_filter import PIIFilter
from app.schemas.chat import ChatQueryResponse, ActionExecuted
from fastapi import HTTPException, status

class AgentService:

    MAX_ITERATIONS = 3

    TOOLS_SCHEMA = [
        {
            "type": "function",
            "function": {
                "name": "lookup_leaflet_rag",
                "description": "Căutare RAG în prospecte pentru informații despre medicamente.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Întrebarea sau numele medicamentului"}
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "add_medication_action",
                "description": "Adaugă un medicament în lista activă de tratament a pacientului.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "drug_name": {"type": "string", "description": "Numele medicamentului de adăugat"}
                    },
                    "required": ["drug_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "check_drug_interactions",
                "description": "Verifică interacțiunile dintre medicamentele din lista pacientului.",
                "parameters": {"type": "object", "properties": {}}
            }
        }
    ]

    @classmethod
    async def process_user_request(cls, user_query: str, current_user: dict) -> ChatQueryResponse:
        user_id = current_user["id"]
        sanitized_query = PIIFilter.sanitize_prompt(user_query)
        
        actions_executed: List[ActionExecuted] = []
        source_leaflet = None
        source_section = None
        
        # Dacă cheia LLM nu este configurată sau e dummy, trecem pe pipeline-ul fallback
        if not settings.LLM_API_KEY or settings.LLM_API_KEY == "your_llm_provider_api_key":
            return await cls._fallback_pipeline(sanitized_query, user_id)

        client = AsyncOpenAI(api_key=settings.LLM_API_KEY)

        messages = [
            {
                "role": "system",
                "content": (
                    "Ești asistentul medical virtual Patient Medication Assistant. "
                    "Răspunzi STRICT pe baza prospectelor oficiale oferite de unelte. "
                    "Folosește uneltele puse la dispoziție pentru a răspunde sau a executa acțiuni."
                )
            },
            {"role": "user", "content": sanitized_query}
        ]

        iteration_count = 0
        
        while iteration_count < cls.MAX_ITERATIONS:
            iteration_count += 1

            try:
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    tools=cls.TOOLS_SCHEMA,
                    tool_choice="auto"
                )
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Eroare API LLM sau depășire de rată."
                )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            if not tool_calls:
                return ChatQueryResponse(
                    answer=response_message.content or "Procesare finalizată.",
                    source_leaflet=source_leaflet,
                    source_section=source_section,
                    actions_executed=actions_executed,
                    disclaimer=settings.MEDICAL_DISCLAIMER
                )

            messages.append(response_message)

            for tool_call in tool_calls:
                func_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments or "{}")
                tool_result = {}

                if func_name == "lookup_leaflet_rag":
                    tool_result = await MCPTools.tool_rag_search(args.get("query", sanitized_query), user_id)
                    if tool_result.get("found"):
                        source_leaflet = f"{tool_result['drug_name']} Leaflet"
                        source_section = "§4.2 / §4.8"

                elif func_name == "add_medication_action":
                    res = await MCPTools.tool_add_medication(args.get("drug_name", ""), user_id)
                    actions_executed.append(ActionExecuted(
                        action_name="Adăugare Medicament",
                        status="success" if res.get("success") else "failed",
                        details=res
                    ))
                    tool_result = res

                elif func_name == "check_drug_interactions":
                    tool_result = await MCPTools.tool_check_interactions(user_id)

                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": func_name,
                    "content": json.dumps(tool_result)
                })

        return ChatQueryResponse(
            answer="Procesarea a atins limita maximă de pași de executare.",
            source_leaflet=source_leaflet,
            source_section=source_section,
            actions_executed=actions_executed,
            disclaimer=settings.MEDICAL_DISCLAIMER
        )

    @classmethod
    async def _fallback_pipeline(cls, query: str, user_id: str) -> ChatQueryResponse:
        """Pipeline determinist executat când LLM_API_KEY nu este configurată."""
        query_lower = query.lower()
        actions = []
        source_leaflet = None
        source_section = None

        if "adaug" in query_lower or "add" in query_lower:
            words = query.split()
            drug_name = words[-1].replace(".", "").strip()
            res = await MCPTools.tool_add_medication(drug_name, user_id)
            
            actions.append(ActionExecuted(
                action_name="Adăugare Medicament",
                status="success" if res.get("success") else "failed",
                details=res
            ))
            
            if res.get("success"):
                answer = f"Am adăugat cu succes medicamentul '{res.get('drug_name')}' în lista ta de tratament."
            else:
                answer = f"Nu am putut adăuga medicamentul '{drug_name}': {res.get('error')}"
        else:
            rag_res = await MCPTools.tool_rag_search(query, user_id)
            if rag_res.get("found"):
                source_leaflet = f"{rag_res['drug_name']} Leaflet"
                source_section = "§4.2 Posologie"
                answer = f"Conform prospectului pentru {rag_res['drug_name']}: {rag_res['context_text'][:250]}..."
            else:
                answer = "Nu am găsit informații relevante în prospectele accesibile contului tău."

        return ChatQueryResponse(
            answer=answer,
            source_leaflet=source_leaflet,
            source_section=source_section,
            actions_executed=actions,
            disclaimer=settings.MEDICAL_DISCLAIMER
        )