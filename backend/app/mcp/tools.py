from typing import Any

from app.core.database import get_supabase_client
from app.services.interaction_service import InteractionService
from app.services.rag_service import RAGService
from app.services.schedule_service import ScheduleService


class MCPTools:
    @staticmethod
    async def tool_rag_search(query: str, user_id: str) -> dict[str, Any]:
        return await RAGService.grounded_context(query, user_id)

    @staticmethod
    async def tool_add_medication(drug_name: str, user_id: str) -> dict[str, Any]:
        supabase = get_supabase_client()
        clean_name = drug_name.strip()

        leaflet_res = (
            supabase.table("leaflets")
            .select("id, drug_name, user_id")
            .or_(f"user_id.is.null,user_id.eq.{user_id}")
            .ilike("drug_name", clean_name)
            .execute()
        )

        if not leaflet_res.data:
            return {
                "success": False,
                "error": "Not found in database",
            }

        matched = leaflet_res.data[0]
        existing = (
            supabase.table("active_medications")
            .select("id")
            .eq("user_id", user_id)
            .ilike("drug_name", matched["drug_name"])
            .execute()
        )
        if existing.data:
            return {
                "success": False,
                "error": f"'{matched['drug_name']}' is already in your list.",
            }

        ins_res = supabase.table("active_medications").insert({
            "user_id": user_id,
            "leaflet_id": matched["id"],
            "drug_name": matched["drug_name"],
        }).execute()

        return {
            "success": True,
            "medication_id": str(ins_res.data[0]["id"]),
            "drug_name": matched["drug_name"],
        }

    @staticmethod
    async def tool_check_interactions(user_id: str) -> dict[str, Any]:
        supabase = get_supabase_client()
        res = supabase.table("active_medications").select("drug_name").eq("user_id", user_id).execute()
        return InteractionService.check([item["drug_name"] for item in res.data])

    @staticmethod
    async def tool_generate_schedule(user_id: str) -> dict[str, Any]:
        payload = ScheduleService.generate(user_id, proposed_by="ai")
        schedule = payload["schedule"]
        return {
            "success": True,
            "schedule_id": str(schedule["id"]),
            "status": schedule["status"],
            "requires_approval": schedule["status"] == "PENDING_APPROVAL",
            "blocked": schedule["status"] == "BLOCKED",
            "blocked_reason": schedule.get("blocked_reason"),
        }
