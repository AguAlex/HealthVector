from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_user
from app.schemas.schedule import (
    CustomScheduleRequest,
    DoseResponse,
    DoseTimeUpdate,
    ScheduleDaySummary,
    ScheduleExportResponse,
    ScheduleHistoryResponse,
    ScheduleProposal,
    ScheduleRecord,
    ScheduleResponse,
)
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])


def _format_time(value: str) -> str:
    return str(value)[:5]


def _serialize(payload: dict, now: datetime | None = None) -> ScheduleResponse:
    schedule = payload["schedule"]
    now = now or datetime.now()
    due_ids = {str(item["id"]) for item in ScheduleService.due_doses(str(schedule["user_id"]), now)}
    doses = [
        DoseResponse(
            id=str(item["id"]),
            schedule_id=str(item["schedule_id"]) if item.get("schedule_id") else None,
            drug_name=item["drug_name"],
            scheduled_time=_format_time(str(item.get("scheduled_time") or "")),
            quantity=item.get("quantity"),
            status=item.get("status") or "scheduled",
            date=str(item.get("date") or schedule.get("date")),
            due=str(item["id"]) in due_ids,
        )
        for item in payload.get("doses", [])
    ]
    return ScheduleResponse(
        schedule=ScheduleRecord(
            id=str(schedule["id"]),
            user_id=str(schedule["user_id"]),
            date=str(schedule["date"]),
            status=schedule["status"],
            proposed_by=schedule.get("proposed_by") or "user",
            interaction_severity=schedule.get("interaction_severity") or "none",
            blocked_reason=schedule.get("blocked_reason"),
            approved_at=str(schedule["approved_at"]) if schedule.get("approved_at") else None,
            selected_proposal=schedule.get("selected_proposal"),
        ),
        doses=doses,
        proposals=[
            ScheduleProposal(
                key=str(item.get("key")),
                label=str(item.get("label") or item.get("key")),
                summary=str(item.get("summary") or ""),
                doses=item.get("doses") or [],
            )
            for item in payload.get("proposals") or []
            if item.get("key")
        ],
        interaction=payload.get("interaction"),
        due_count=len(due_ids),
    )


@router.get("/history", response_model=ScheduleHistoryResponse)
async def get_schedule_history(
    start: date = Query(..., description="Inclusive start date (YYYY-MM-DD)"),
    end: date = Query(..., description="Inclusive end date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user),
):
    if end < start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be on or after start date.")
    if (end - start).days > 62:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="History range cannot exceed 62 days.")
    days = ScheduleService.history(current_user["id"], start.isoformat(), end.isoformat())
    return ScheduleHistoryResponse(days=[ScheduleDaySummary(**item) for item in days])


@router.get("/today", response_model=ScheduleResponse)
async def get_today_schedule(current_user: dict = Depends(get_current_user)):
    payload = ScheduleService.get_today(current_user["id"])
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No schedule for today.")
    return _serialize(payload)


@router.post("/generate", response_model=ScheduleResponse)
async def generate_schedule(current_user: dict = Depends(get_current_user)):
    payload = ScheduleService.generate(current_user["id"], proposed_by="user")
    return _serialize(payload)


@router.post("/{schedule_id}/proposals/{proposal_key}", response_model=ScheduleResponse)
async def select_schedule_proposal(
    schedule_id: str,
    proposal_key: str,
    current_user: dict = Depends(get_current_user),
):
    payload = ScheduleService.apply_proposal(current_user["id"], schedule_id, proposal_key)
    return _serialize(payload)


@router.post("/{schedule_id}/custom", response_model=ScheduleResponse)
async def save_custom_schedule(
    schedule_id: str,
    body: CustomScheduleRequest,
    current_user: dict = Depends(get_current_user),
):
    payload = ScheduleService.apply_custom(
        current_user["id"],
        schedule_id,
        [item.model_dump() for item in body.doses],
    )
    return _serialize(payload)


@router.post("/{schedule_id}/approve", response_model=ScheduleResponse)
async def approve_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    payload = ScheduleService.approve(current_user["id"], schedule_id)
    return _serialize(payload)


@router.post("/{schedule_id}/reject", response_model=ScheduleResponse)
async def reject_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    payload = ScheduleService.reject(current_user["id"], schedule_id)
    return _serialize(payload)


@router.post("/doses/{dose_id}/taken", response_model=DoseResponse)
async def mark_taken(dose_id: str, current_user: dict = Depends(get_current_user)):
    dose = ScheduleService.set_dose_status(current_user["id"], dose_id, "taken")
    return DoseResponse(
        id=str(dose["id"]),
        schedule_id=str(dose["schedule_id"]) if dose.get("schedule_id") else None,
        drug_name=dose["drug_name"],
        scheduled_time=_format_time(str(dose.get("scheduled_time") or "")),
        status=dose["status"],
        date=str(dose.get("date") or ""),
        due=False,
    )


@router.post("/doses/{dose_id}/missed", response_model=DoseResponse)
async def mark_missed(dose_id: str, current_user: dict = Depends(get_current_user)):
    dose = ScheduleService.set_dose_status(current_user["id"], dose_id, "missed")
    return DoseResponse(
        id=str(dose["id"]),
        schedule_id=str(dose["schedule_id"]) if dose.get("schedule_id") else None,
        drug_name=dose["drug_name"],
        scheduled_time=_format_time(str(dose.get("scheduled_time") or "")),
        status=dose["status"],
        date=str(dose.get("date") or ""),
        due=False,
    )


@router.patch("/doses/{dose_id}", response_model=ScheduleResponse)
async def update_dose_time(
    dose_id: str,
    body: DoseTimeUpdate,
    current_user: dict = Depends(get_current_user),
):
    payload = ScheduleService.update_dose_time(current_user["id"], dose_id, body.scheduled_time)
    return _serialize(payload)


@router.get("/export", response_model=ScheduleExportResponse)
async def export_schedule(current_user: dict = Depends(get_current_user)):
    return ScheduleExportResponse(text=ScheduleService.export_text(current_user["id"]))
