from fastapi import APIRouter, HTTPException, status, Depends

from app.core.database import get_supabase_client
from app.core.dependencies import get_current_user
from app.schemas.medication import MedicationAddRequest, MedicationResponse, InteractionCheckResponse
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/api/medications", tags=["Medications"])


def _side_effects(sections: dict | None) -> str | None:
    if not isinstance(sections, dict):
        return None
    return sections.get("4.8") or sections.get("4.8 Undesirable effects")


def _to_response(item: dict, leaflet: dict | None = None) -> MedicationResponse:
    sections = (leaflet or {}).get("sections") if leaflet else item.get("sections")
    return MedicationResponse(
        id=str(item["id"]),
        user_id=str(item["user_id"]),
        drug_name=item["drug_name"],
        added_at=str(item["added_at"]),
        leaflet_id=str(item["leaflet_id"]) if item.get("leaflet_id") else None,
        side_effects=_side_effects(sections if isinstance(sections, dict) else None),
    )


@router.post("", response_model=MedicationResponse)
async def add_medication(req: MedicationAddRequest, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    drug_name = req.drug_name.strip()
    user_id = current_user["id"]

    leaflet_check = (
        supabase.table("leaflets")
        .select("id, drug_name, user_id, sections")
        .or_(f"user_id.is.null,user_id.eq.{user_id}")
        .ilike("drug_name", drug_name)
        .execute()
    )

    if not leaflet_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found in database",
        )

    matched_leaflet = leaflet_check.data[0]
    leaflet_id = str(matched_leaflet["id"])

    res = supabase.table("active_medications").insert({
        "user_id": user_id,
        "leaflet_id": leaflet_id,
        "drug_name": matched_leaflet["drug_name"],
    }).execute()

    added_item = res.data[0]
    return _to_response(added_item, matched_leaflet)


@router.get("", response_model=list[MedicationResponse])
async def get_active_medications(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]

    res = supabase.table("active_medications").select("*").eq("user_id", user_id).execute()
    leaflet_ids = [item["leaflet_id"] for item in res.data if item.get("leaflet_id")]
    leaflet_map: dict[str, dict] = {}
    if leaflet_ids:
        leaflets = supabase.table("leaflets").select("id, sections").in_("id", leaflet_ids).execute()
        leaflet_map = {str(item["id"]): item for item in (leaflets.data or [])}

    return [
        _to_response(item, leaflet_map.get(str(item.get("leaflet_id") or "")))
        for item in res.data
    ]


@router.delete("/{medication_id}")
async def remove_medication(medication_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]

    res = supabase.table("active_medications").delete().eq("id", medication_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found in database",
        )

    drug_name = res.data[0].get("drug_name")
    if drug_name:
        supabase.table("daily_schedule").delete().eq("user_id", user_id).eq("drug_name", drug_name).execute()
    return {"message": "Medication removed", "deleted_id": medication_id}


@router.get("/interactions", response_model=InteractionCheckResponse)
async def check_interactions(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]

    res = supabase.table("active_medications").select("drug_name").eq("user_id", user_id).execute()
    result = InteractionService.check([item["drug_name"] for item in res.data])
    return InteractionCheckResponse(
        has_interaction=result["has_interaction"],
        warning_message=result["warning_message"],
        affected_drugs=result["affected_drugs"],
        severity=result["severity"],
    )


@router.post("/reset")
async def reset_dashboard(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]

    supabase.table("daily_schedule").delete().eq("user_id", user_id).execute()
    supabase.table("schedules").delete().eq("user_id", user_id).execute()
    supabase.table("active_medications").delete().eq("user_id", user_id).execute()
    return {"message": "Your medication list and schedule were reset."}
