from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatQueryRequest(BaseModel):
    question: str = Field(..., example="Adaugă Nurofen în lista mea și spune-mi ce reacții adverse are Paracetamolul.")

class ActionExecuted(BaseModel):
    action_name: str
    status: str
    details: Dict[str, Any]

class ChatQueryResponse(BaseModel):
    answer: str
    source_leaflet: Optional[str] = None
    source_section: Optional[str] = None
    actions_executed: List[ActionExecuted] = []
    disclaimer: str