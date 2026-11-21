from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ChatQueryRequest(BaseModel):
    question: str = Field(..., example="Can I take Paracetamol with food?")


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
    grounded: bool = False
    fallback: bool = False
