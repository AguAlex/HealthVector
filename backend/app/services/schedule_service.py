import re
from datetime import date, datetime, time, timezone
from typing import Any

from fastapi import HTTPException, status

from app.core.audit import audit
from app.core.database import get_supabase_client
from app.services.interaction_service import InteractionService

_DEFAULT_TIMES = {
    "paracetamol": ["08:00", "14:00", "20:00"],
    "aspirin": ["08:00"],
    "warfarin": ["18:00"],
    "ibuprofen": ["08:00", "14:00", "20:00"],
    "simvastatin": ["18:00"],
    "clarithromycin": ["08:00", "20:00"],
    "fluoxetine": ["08:00"],
    "sertraline": ["08:00"],
    "digoxin": ["08:00"],
    "lisinopril": ["08:00"],
    "spironolactone": ["08:00"],
    "potassium chloride": ["08:00", "20:00"],
    "methotrexate": ["08:00"],
    "ciprofloxacin": ["08:00", "20:00"],
    "amiodarone": ["08:00"],
    "lithium": ["08:00", "20:00"],
}

_TIME_PATTERN = re.compile(r"^(\d{1,2}):(\d{2})(?::\d{2})?$")


class ScheduleService:
    @staticmethod
    def _times_for(drug_name: str, section_42: str | None) -> list[str]:
        text = (section_42 or "").lower()
        if "18:00" in text or "seara" in text or "evening" in text:
            return ["18:00"]
        if "4-6" in text or "4–6" in text or "every 4" in text:
            return ["08:00", "14:00", "20:00"]
        if "6-8" in text or "6–8" in text or "every 6" in text:
            return ["08:00", "14:00", "20:00"]
        if "o dată" in text or "once" in text:
            return ["08:00"]
        return _DEFAULT_TIMES.get(drug_name.strip().lower(), ["08:00"])

    @staticmethod
    def _normalize_time(value: str) -> str:
        match = _TIME_PATTERN.match((value or "").strip())
        if not match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled time must be in HH:MM format.",
            )
        hour, minute = int(match.group(1)), int(match.group(2))
        if hour > 23 or minute > 59:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled time must be a valid clock time.",
            )
        return f"{hour:02d}:{minute:02d}"

    @staticmethod
    def _today() -> str:
        return date.today().isoformat()

    @classmethod
    def _active_schedule(cls, user_id: str, day: str | None = None) -> dict[str, Any] | None:
        supabase = get_supabase_client()
        day = day or cls._today()
        res = (
            supabase.table("schedules")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", day)
            .in_("status", ["PENDING_APPROVAL", "APPROVED", "BLOCKED"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    @classmethod
    def _doses_for(cls, schedule_id: str) -> list[dict[str, Any]]:
        supabase = get_supabase_client()
        res = (
            supabase.table("daily_schedule")
            .select("*")
            .eq("schedule_id", schedule_id)
            .order("scheduled_time")
            .execute()
        )
        return res.data or []

    @classmethod
    def get_today(cls, user_id: str) -> dict[str, Any] | None:
        schedule = cls._active_schedule(user_id)
        if not schedule:
            return None
        return {"schedule": schedule, "doses": cls._doses_for(str(schedule["id"]))}

    @classmethod
    def history(cls, user_id: str, start: str, end: str) -> list[dict[str, Any]]:
        supabase = get_supabase_client()
        res = (
            supabase.table("schedules")
            .select("*")
            .eq("user_id", user_id)
            .gte("date", start)
            .lte("date", end)
            .order("created_at", desc=True)
            .execute()
        )
        rows = res.data or []
        by_date: dict[str, dict[str, Any]] = {}
        rank = {"APPROVED": 0, "PENDING_APPROVAL": 1, "BLOCKED": 2, "SUPERSEDED": 3}
        for row in rows:
            day = str(row.get("date") or "")
            if not day:
                continue
            current = by_date.get(day)
            if current is None or rank.get(row.get("status"), 9) < rank.get(current.get("status"), 9):
                by_date[day] = row

        chosen = list(by_date.values())
        if not chosen:
            return []

        ids = [str(item["id"]) for item in chosen]
        doses_res = (
            supabase.table("daily_schedule")
            .select("schedule_id, status")
            .in_("schedule_id", ids)
            .execute()
        )
        counts: dict[str, dict[str, int]] = {schedule_id: {"total": 0, "taken": 0, "missed": 0} for schedule_id in ids}
        for dose in doses_res.data or []:
            schedule_id = str(dose.get("schedule_id") or "")
            if schedule_id not in counts:
                continue
            counts[schedule_id]["total"] += 1
            status = dose.get("status")
            if status == "taken":
                counts[schedule_id]["taken"] += 1
            elif status == "missed":
                counts[schedule_id]["missed"] += 1

        summaries: list[dict[str, Any]] = []
        for row in chosen:
            schedule_id = str(row["id"])
            tally = counts.get(schedule_id, {"total": 0, "taken": 0, "missed": 0})
            total = tally["total"]
            taken = tally["taken"]
            summaries.append(
                {
                    "date": str(row["date"]),
                    "schedule_id": schedule_id,
                    "status": row.get("status") or "PENDING_APPROVAL",
                    "total_doses": total,
                    "taken_count": taken,
                    "missed_count": tally["missed"],
                    "all_taken": total > 0 and taken == total,
                }
            )
        summaries.sort(key=lambda item: item["date"])
        return summaries

    @classmethod
    def generate(cls, user_id: str, proposed_by: str = "user") -> dict[str, Any]:
        supabase = get_supabase_client()
        day = cls._today()
        meds = (
            supabase.table("active_medications")
            .select("id, drug_name, leaflet_id")
            .eq("user_id", user_id)
            .execute()
        )
        if not meds.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Add at least one medication before generating a schedule.",
            )

        names = [item["drug_name"] for item in meds.data]
        interaction = InteractionService.check(names)
        schedule_status = "BLOCKED" if interaction["severity"] == "high" else "PENDING_APPROVAL"
        blocked_reason = interaction["warning_message"] if schedule_status == "BLOCKED" else None

        existing = (
            supabase.table("schedules")
            .select("id")
            .eq("user_id", user_id)
            .eq("date", day)
            .in_("status", ["PENDING_APPROVAL", "APPROVED", "BLOCKED"])
            .execute()
        )
        if existing.data:
            for row in existing.data:
                supabase.table("schedules").update({"status": "SUPERSEDED"}).eq("id", row["id"]).execute()

        created = (
            supabase.table("schedules")
            .insert(
                {
                    "user_id": user_id,
                    "date": day,
                    "status": schedule_status,
                    "proposed_by": proposed_by if proposed_by in ("user", "ai") else "user",
                    "interaction_severity": interaction["severity"],
                    "blocked_reason": blocked_reason,
                }
            )
            .execute()
        )
        schedule = created.data[0]
        schedule_id = str(schedule["id"])

        leaflet_ids = [item["leaflet_id"] for item in meds.data if item.get("leaflet_id")]
        leaflet_map: dict[str, dict[str, Any]] = {}
        if leaflet_ids:
            leaflets = supabase.table("leaflets").select("id, drug_name, sections").in_("id", leaflet_ids).execute()
            leaflet_map = {str(item["id"]): item for item in (leaflets.data or [])}

        dose_rows: list[dict[str, Any]] = []
        for med in meds.data:
            leaflet = leaflet_map.get(str(med.get("leaflet_id") or ""))
            sections = (leaflet or {}).get("sections") or {}
            section_42 = sections.get("4.2") if isinstance(sections, dict) else None
            for scheduled in cls._times_for(med["drug_name"], section_42):
                dose_rows.append(
                    {
                        "user_id": user_id,
                        "schedule_id": schedule_id,
                        "leaflet_id": med.get("leaflet_id"),
                        "drug_name": med["drug_name"],
                        "scheduled_time": scheduled,
                        "status": "scheduled",
                        "date": day,
                    }
                )

        if dose_rows:
            supabase.table("daily_schedule").insert(dose_rows).execute()

        audit(
            "schedule_generated",
            schedule_status,
            interaction_severity=interaction["severity"],
            dose_count=len(dose_rows),
        )
        return {"schedule": schedule, "doses": cls._doses_for(schedule_id), "interaction": interaction}

    @classmethod
    def approve(cls, user_id: str, schedule_id: str) -> dict[str, Any]:
        supabase = get_supabase_client()
        res = (
            supabase.table("schedules")
            .select("*")
            .eq("id", schedule_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        schedule = res.data[0]
        if schedule["status"] == "BLOCKED":
            audit("schedule_approve_refused", "blocked")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=schedule.get("blocked_reason")
                or "This schedule is blocked because of a high-severity interaction. Consult a healthcare professional.",
            )
        if schedule["status"] != "PENDING_APPROVAL":
            audit("schedule_approve_refused", schedule["status"])
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only a pending schedule can be approved. Saving without approval is refused.",
            )

        updated = (
            supabase.table("schedules")
            .update({"status": "APPROVED", "approved_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", schedule_id)
            .eq("user_id", user_id)
            .execute()
        )
        audit("schedule_approved", "APPROVED")
        return {"schedule": updated.data[0], "doses": cls._doses_for(schedule_id)}

    @classmethod
    def reject(cls, user_id: str, schedule_id: str) -> dict[str, Any]:
        supabase = get_supabase_client()
        res = (
            supabase.table("schedules")
            .update({"status": "SUPERSEDED"})
            .eq("id", schedule_id)
            .eq("user_id", user_id)
            .in_("status", ["PENDING_APPROVAL", "BLOCKED"])
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found or cannot be rejected.")
        audit("schedule_rejected", "SUPERSEDED")
        return {"schedule": res.data[0], "doses": []}

    @classmethod
    def set_dose_status(cls, user_id: str, dose_id: str, new_status: str) -> dict[str, Any]:
        if new_status not in ("taken", "missed"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be taken or missed.")
        supabase = get_supabase_client()
        dose_res = (
            supabase.table("daily_schedule")
            .select("*")
            .eq("id", dose_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not dose_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose not found.")
        dose = dose_res.data[0]
        schedule_id = dose.get("schedule_id")
        if not schedule_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dose is not attached to an approved schedule.")
        schedule_res = (
            supabase.table("schedules")
            .select("status")
            .eq("id", schedule_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not schedule_res.data or schedule_res.data[0]["status"] != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Doses can be marked taken or missed only after the schedule is approved.",
            )
        updated = (
            supabase.table("daily_schedule")
            .update({"status": new_status})
            .eq("id", dose_id)
            .eq("user_id", user_id)
            .execute()
        )
        audit("dose_status", new_status)
        return updated.data[0]

    @classmethod
    def update_dose_time(cls, user_id: str, dose_id: str, scheduled_time: str) -> dict[str, Any]:
        normalized = cls._normalize_time(scheduled_time)
        supabase = get_supabase_client()
        dose_res = (
            supabase.table("daily_schedule")
            .select("*")
            .eq("id", dose_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not dose_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose not found.")
        dose = dose_res.data[0]
        if dose.get("status") != "scheduled":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only a scheduled dose can be moved. Taken or missed doses cannot be edited.",
            )
        schedule_id = dose.get("schedule_id")
        if not schedule_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dose is not attached to a schedule.")
        schedule_res = (
            supabase.table("schedules")
            .select("*")
            .eq("id", schedule_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not schedule_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        schedule = schedule_res.data[0]
        if schedule["status"] not in ("PENDING_APPROVAL", "APPROVED", "BLOCKED"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This schedule can no longer be edited.",
            )

        supabase.table("daily_schedule").update({"scheduled_time": normalized}).eq("id", dose_id).eq(
            "user_id", user_id
        ).execute()

        if schedule["status"] == "APPROVED":
            supabase.table("schedules").update(
                {"status": "PENDING_APPROVAL", "approved_at": None, "proposed_by": "user"}
            ).eq("id", schedule_id).eq("user_id", user_id).execute()
            audit("schedule_modified", "PENDING_APPROVAL")
        else:
            audit("dose_time_updated", schedule["status"])

        payload = cls.get_today(user_id)
        if not payload:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        names = list({item["drug_name"] for item in payload["doses"]})
        payload["interaction"] = InteractionService.check(names)
        return payload

    @classmethod
    def export_text(cls, user_id: str) -> str:
        payload = cls.get_today(user_id)
        if not payload:
            return "No schedule for today."
        schedule = payload["schedule"]
        lines = [
            f"HealthVector daily schedule — {schedule.get('date')}",
            f"Status: {schedule.get('status')}",
            "Prototype only. Not professional medical advice.",
            "",
        ]
        for dose in payload["doses"]:
            raw_time = str(dose.get("scheduled_time") or "")[:5]
            lines.append(f"{raw_time} {dose.get('drug_name')} — {dose.get('status')}")
        return "\n".join(lines)

    @classmethod
    def due_doses(cls, user_id: str, now: datetime | None = None) -> list[dict[str, Any]]:
        payload = cls.get_today(user_id)
        if not payload or payload["schedule"].get("status") != "APPROVED":
            return []
        now = now or datetime.now()
        current = now.time()
        due = []
        for dose in payload["doses"]:
            if dose.get("status") != "scheduled":
                continue
            raw = str(dose.get("scheduled_time") or "00:00:00")
            parts = raw.split(":")
            try:
                scheduled = time(int(parts[0]), int(parts[1]))
            except (ValueError, IndexError):
                continue
            if scheduled <= current:
                due.append(dose)
        return due
