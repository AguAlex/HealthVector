from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from app.schemas.medication import DosingInput

class LeafletCreateRequest(BaseModel):
    drug_name: str = Field(..., min_length=1, max_length=120, example="Nurofen Forte")
    leaflet_text: str = Field(..., min_length=20, max_length=20000, example="Prospectul complet al medicamentului adăugat de utilizator...")
    dosing: Optional[DosingInput] = None
    side_effects: Optional[str] = Field(default=None, max_length=4000)
    interactions: Optional[str] = Field(default=None, max_length=4000)
    sections: Optional[Dict[str, Any]] = Field(default=None)

class LeafletCatalogItem(BaseModel):
    drug_name: str
    is_default: bool
    suggested_doses_per_day: int = 1
    suggested_interval_hours: float = 24
    suggested_quantity: Optional[str] = None


class LeafletResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    drug_name: str
    leaflet_text: str
    is_default: bool
    sections: Optional[Dict[str, Any]] = None
    created_at: str