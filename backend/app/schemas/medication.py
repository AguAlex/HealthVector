from pydantic import BaseModel, Field
from typing import Optional, List


class DosingInput(BaseModel):
    doses_per_day: Optional[int] = Field(default=None, ge=1, le=6, example=2)
    interval_hours: Optional[float] = Field(default=None, ge=1, le=24, example=12)
    quantity: Optional[str] = Field(default=None, max_length=80, example="1 tablet")
    times: list[str] = Field(default_factory=list)


class MedicationAddRequest(BaseModel):
    drug_name: str = Field(..., example="Paracetamol")
    dosing: Optional[DosingInput] = None

class MedicationResponse(BaseModel):
    id: str
    user_id: str
    drug_name: str
    added_at: str
    leaflet_id: Optional[str] = None
    side_effects: Optional[str] = None
    dosing: Optional[dict] = None

class InteractionCheckResponse(BaseModel):
    has_interaction: bool
    warning_message: Optional[str] = None
    affected_drugs: List[str] = []
    severity: Optional[str] = "none"