from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class LeafletCreateRequest(BaseModel):
    drug_name: str = Field(..., min_length=1, max_length=120, example="Nurofen Forte")
    leaflet_text: str = Field(..., min_length=20, max_length=20000, example="Prospectul complet al medicamentului adăugat de utilizator...")
    sections: Optional[Dict[str, Any]] = Field(default={}, example={"4.1": "Indicații", "4.2": "Posologie"})

class LeafletResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    drug_name: str
    leaflet_text: str
    is_default: bool
    sections: Optional[Dict[str, Any]] = None
    created_at: str