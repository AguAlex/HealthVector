from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import get_supabase_client
from app.core.dependencies import get_current_user
from app.schemas.medication import MedicationAddRequest, MedicationResponse, InteractionCheckResponse

router = APIRouter(prefix="/api/medications", tags=["Medications"])

@router.post("", response_model=MedicationResponse)
async def add_medication(req: MedicationAddRequest, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    drug_name = req.drug_name.strip()
    user_id = current_user["id"]
    
    # Caută medicamentul în prospectele VIZIBILE utilizatorului (Default SAU Custom)
    leaflet_check = supabase.table("leaflets").select("id, drug_name, user_id").or_(f"user_id.is.null,user_id.eq.{user_id}").ilike("drug_name", drug_name).execute()
    
    if not leaflet_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medicamentul '{drug_name}' nu a fost găsit în baza de date cu prospecte (nici în cele implicite, nici în cele adăugate de tine)."
        )
        
    matched_leaflet = leaflet_check.data[0]
    leaflet_id = str(matched_leaflet["id"])
    
    # Salvează în lista activă de tratament a pacientului
    res = supabase.table("active_medications").insert({
        "user_id": user_id,
        "leaflet_id": leaflet_id,
        "drug_name": matched_leaflet["drug_name"]
    }).execute()
    
    added_item = res.data[0]
    return MedicationResponse(
        id=str(added_item["id"]),
        user_id=str(added_item["user_id"]),
        leaflet_id=leaflet_id,
        drug_name=added_item["drug_name"],
        is_custom_leaflet=(matched_leaflet.get("user_id") is not None),
        added_at=str(added_item["added_at"])
    )

@router.get("", response_model=list[MedicationResponse])
async def get_active_medications(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    res = supabase.table("active_medications").select("*").eq("user_id", user_id).execute()
    return [
        MedicationResponse(
            id=str(item["id"]),
            user_id=str(item["user_id"]),
            drug_name=item["drug_name"],
            added_at=str(item["added_at"])
        )
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
            detail="Medicamentul nu a fost găsit în lista ta."
        )
    return {"message": "Medicament șters cu succes", "deleted_id": medication_id}

@router.get("/interactions", response_model=InteractionCheckResponse)
async def check_interactions(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    res = supabase.table("active_medications").select("drug_name").eq("user_id", user_id).execute()
    active_drugs = [item["drug_name"].lower() for item in res.data]
    
    if "warfarin" in active_drugs and ("aspirin" in active_drugs or "paracetamol" in active_drugs):
        return InteractionCheckResponse(
            has_interaction=True,
            warning_message="ATENȚIE: Interacțiune majoră detectată între Warfarin și Aspirin/Paracetamol în lista ta.",
            affected_drugs=["Warfarin", "Aspirin/Paracetamol"]
        )
    return InteractionCheckResponse(has_interaction=False)

@router.post("/reset")
async def reset_dashboard(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    # Șterge doar datele pacientului curent
    supabase.table("active_medications").delete().eq("user_id", user_id).execute()
    supabase.table("daily_schedule").delete().eq("user_id", user_id).execute()
    return {"message": "Datele tale au fost resetate cu succes."}