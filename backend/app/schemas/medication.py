from pydantic import BaseModel, Field
from typing import Optional, List

class MedicationAddRequest(BaseModel):
    drug_name: str = Field(..., example="Paracetamol")

class MedicationResponse(BaseModel):
    id: str
    user_id: str
    drug_name: str
    added_at: str

class InteractionCheckResponse(BaseModel):
    has_interaction: bool
    warning_message: Optional[str] = None
    affected_drugs: List[str] = []