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


class ScheduleDaySummary(BaseModel):
    date: str
    schedule_id: str
    status: str
    total_doses: int
    taken_count: int
    missed_count: int
    all_taken: bool


class ScheduleHistoryResponse(BaseModel):
    days: list[ScheduleDaySummary]


class DoseTimeUpdate(BaseModel):
    scheduled_time: str = Field(..., example="14:30")
