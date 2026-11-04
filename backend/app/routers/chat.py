from fastapi import APIRouter, Depends
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse
from app.services.agent_service import AgentService
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/chat", tags=["RAG Chat & Actions"])

@router.post("", response_model=ChatQueryResponse)
async def ask_chat_agent(req: ChatQueryRequest, current_user: dict = Depends(get_current_user)):
    """
    Endpoint-ul unificat de Chatbot:
    - Răspunde la întrebări RAG bazate pe prospecte.
    - Execută acțiuni prin unelte MCP (ex: adăugare medicamente în listă).
    - Verifică interacțiunile medicamentoase.
    """
    return await AgentService.process_user_request(req.question, current_user)