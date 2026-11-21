from datetime import date, datetime, time, timezone
from typing import Any

from fastapi import HTTPException, status

from app.core.audit import audit
from app.core.database import get_supabase_client
from app.services.dosing import (
    build_proposals,
    normalize_time,
    resolve_regimen,
    validate_plan_times,
)
from app.services.interaction_service import InteractionService


class ScheduleService:
    @staticmethod
    def _normalize_time(value: str) -> str:
        return normalize_time(value)

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
        return {
            "schedule": schedule,
            "doses": cls._doses_for(str(schedule["id"])),
            "proposals": schedule.get("proposals") or [],
        }

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
    def _regimens_for(cls, medications: list[dict[str, Any]]) -> list[dict[str, Any]]:
        supabase = get_supabase_client()
        leaflet_ids = [item["leaflet_id"] for item in medications if item.get("leaflet_id")]
        leaflet_map: dict[str, dict[str, Any]] = {}
        if leaflet_ids:
            leaflets = supabase.table("leaflets").select("id, drug_name, sections").in_("id", leaflet_ids).execute()
            leaflet_map = {str(item["id"]): item for item in (leaflets.data or [])}

        regimens: list[dict[str, Any]] = []
        for med in medications:
            leaflet = leaflet_map.get(str(med.get("leaflet_id") or ""))
            sections = (leaflet or {}).get("sections") or {}
            section_42 = sections.get("4.2") if isinstance(sections, dict) else None
            resolved = resolve_regimen(med.get("dosing"), med["drug_name"], section_42)
            regimens.append(
                {
                    "drug_name": med["drug_name"],
                    "leaflet_id": med.get("leaflet_id"),
                    "doses_per_day": resolved["doses_per_day"],
                    "interval_hours": resolved["interval_hours"],
                    "quantity": resolved.get("quantity"),
                }
            )
        return regimens

    @classmethod
    def _regimen_map(cls, user_id: str) -> dict[str, dict[str, Any]]:
        supabase = get_supabase_client()
        meds = (
            supabase.table("active_medications")
            .select("id, drug_name, leaflet_id, dosing")
            .eq("user_id", user_id)
            .execute()
        )
        return {item["drug_name"]: item for item in cls._regimens_for(meds.data or [])}

    @classmethod
    def _replace_doses(
        cls,
        user_id: str,
        schedule_id: str,
        day: str,
        doses: list[dict[str, Any]],
        leaflet_by_name: dict[str, Any] | None = None,
    ) -> None:
        supabase = get_supabase_client()
        supabase.table("daily_schedule").delete().eq("schedule_id", schedule_id).eq("user_id", user_id).execute()
        if not doses:
            return
        leaflet_by_name = leaflet_by_name or {}
        rows = [
            {
                "user_id": user_id,
                "schedule_id": schedule_id,
                "leaflet_id": leaflet_by_name.get(item["drug_name"]),
                "drug_name": item["drug_name"],
                "scheduled_time": normalize_time(str(item["scheduled_time"])),
                "quantity": item.get("quantity"),
                "status": "scheduled",
                "date": day,
            }
            for item in doses
        ]
        supabase.table("daily_schedule").insert(rows).execute()

    @classmethod
    def _payload(cls, user_id: str, interaction: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = cls.get_today(user_id)
        if not payload:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        if interaction is None:
            names = list({item["drug_name"] for item in payload["doses"]})
            if not names:
                names = [
                    item["drug_name"]
                    for proposal in (payload.get("proposals") or [])
                    for item in proposal.get("doses") or []
                ]
            payload["interaction"] = InteractionService.check(list(dict.fromkeys(names)))
        else:
            payload["interaction"] = interaction
        return payload

    @classmethod
    def apply_proposal(cls, user_id: str, schedule_id: str, proposal_key: str) -> dict[str, Any]:
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=schedule.get("blocked_reason")
                or "This schedule is blocked because of a high-severity interaction.",
            )
        if schedule["status"] not in ("PENDING_APPROVAL", "APPROVED"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This schedule can no longer be edited.")

        proposals = schedule.get("proposals") or []
        chosen = next((item for item in proposals if item.get("key") == proposal_key), None)
        if not chosen:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="That schedule option was not found.")

        regimens = cls._regimen_map(user_id)
        plan: dict[str, list[str]] = {}
        for dose in chosen.get("doses") or []:
            plan.setdefault(dose["drug_name"], []).append(dose["scheduled_time"])
        validate_plan_times(plan, regimens)

        leaflet_by_name = {name: item.get("leaflet_id") for name, item in regimens.items()}
        cls._replace_doses(user_id, schedule_id, str(schedule["date"]), chosen["doses"], leaflet_by_name)
        updates: dict[str, Any] = {"selected_proposal": proposal_key}
        if schedule["status"] == "APPROVED":
            updates["status"] = "PENDING_APPROVAL"
            updates["approved_at"] = None
            updates["proposed_by"] = "user"
        supabase.table("schedules").update(updates).eq("id", schedule_id).eq("user_id", user_id).execute()
        audit("schedule_proposal_selected", proposal_key)
        return cls._payload(user_id)

    @classmethod
    def apply_custom(cls, user_id: str, schedule_id: str, doses: list[dict[str, Any]]) -> dict[str, Any]:
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=schedule.get("blocked_reason")
                or "This schedule is blocked because of a high-severity interaction.",
            )
        if schedule["status"] not in ("PENDING_APPROVAL", "APPROVED"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This schedule can no longer be edited.")

        regimens = cls._regimen_map(user_id)
        plan: dict[str, list[str]] = {}
        quantity_by_drug = {name: item.get("quantity") for name, item in regimens.items()}
        normalized: list[dict[str, Any]] = []
        for item in doses:
            drug_name = str(item.get("drug_name") or "").strip()
            scheduled = normalize_time(str(item.get("scheduled_time") or ""))
            plan.setdefault(drug_name, []).append(scheduled)
            normalized.append(
                {
                    "drug_name": drug_name,
                    "scheduled_time": scheduled,
                    "quantity": item.get("quantity") or quantity_by_drug.get(drug_name),
                }
            )
        validate_plan_times(plan, regimens)
        leaflet_by_name = {name: item.get("leaflet_id") for name, item in regimens.items()}
        cls._replace_doses(user_id, schedule_id, str(schedule["date"]), normalized, leaflet_by_name)
        updates: dict[str, Any] = {"selected_proposal": "custom", "proposed_by": "user"}
        if schedule["status"] == "APPROVED":
            updates["status"] = "PENDING_APPROVAL"
            updates["approved_at"] = None
        supabase.table("schedules").update(updates).eq("id", schedule_id).eq("user_id", user_id).execute()
        audit("schedule_custom_saved", "custom", dose_count=len(normalized))
        return cls._payload(user_id)

    @classmethod
    def generate(cls, user_id: str, proposed_by: str = "user") -> dict[str, Any]:
        supabase = get_supabase_client()
        day = cls._today()
        meds = (
            supabase.table("active_medications")
            .select("id, drug_name, leaflet_id, dosing")
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

        regimens = cls._regimens_for(meds.data)
        proposals = build_proposals(regimens)

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
                    "proposals": proposals,
                    "selected_proposal": None,
                }
            )
            .execute()
        )
        schedule = created.data[0]
        schedule_id = str(schedule["id"])

        audit(
            "schedule_generated",
            schedule_status,
            interaction_severity=interaction["severity"],
            proposal_count=len(proposals),
        )
        return {
            "schedule": schedule,
            "doses": [],
            "proposals": proposals,
            "interaction": interaction,
        }

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
        if not cls._doses_for(schedule_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Choose one of the proposed plans, or save custom hours, before approving.",
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

        current_doses = cls._doses_for(str(schedule_id))
        plan: dict[str, list[str]] = {}
        for item in current_doses:
            time_value = normalized if str(item["id"]) == str(dose_id) else str(item.get("scheduled_time") or "")[:5]
            plan.setdefault(item["drug_name"], []).append(time_value)
        validate_plan_times(plan, cls._regimen_map(user_id))

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

        return cls._payload(user_id)

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
            quantity = dose.get("quantity")
            extra = f" ({quantity})" if quantity else ""
            lines.append(f"{raw_time} {dose.get('drug_name')}{extra} — {dose.get('status')}")
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
