from typing import Any, Optional

from pydantic import BaseModel, Field


class DoseResponse(BaseModel):
    id: str
    schedule_id: Optional[str] = None
    drug_name: str
    scheduled_time: str
    status: str
    date: str
    due: bool = False


class ScheduleRecord(BaseModel):
    id: str
    user_id: str
    date: str
    status: str
    proposed_by: str
    interaction_severity: Optional[str] = "none"
    blocked_reason: Optional[str] = None
    approved_at: Optional[str] = None


class ScheduleResponse(BaseModel):
    schedule: ScheduleRecord
    doses: list[DoseResponse]
    interaction: Optional[dict[str, Any]] = None
    due_count: int = 0


class ScheduleExportResponse(BaseModel):
    text: str


class DoseTimeUpdate(BaseModel):
    scheduled_time: str = Field(..., example="14:30")
