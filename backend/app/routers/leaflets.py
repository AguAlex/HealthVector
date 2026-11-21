from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import get_supabase_client
from app.core.dependencies import get_current_user
from app.schemas.leaflet import LeafletCatalogItem, LeafletCreateRequest, LeafletResponse
from app.services.dosing import posology_sentence, suggested_from_leaflet, validate_dosing
from app.services.rag_service import RAGService

router = APIRouter(prefix="/api/leaflets", tags=["Leaflets & Knowledge Base"])

@router.get("/catalog", response_model=list[LeafletCatalogItem])
async def get_leaflet_catalog(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    user_id = current_user["id"]
    res = (
        supabase.table("leaflets")
        .select("drug_name, user_id, sections")
        .or_(f"user_id.is.null,user_id.eq.{user_id}")
        .execute()
    )
    unique: dict[str, LeafletCatalogItem] = {}
    for item in res.data or []:
        name = str(item.get("drug_name") or "").strip()
        if not name:
            continue
        is_default = item.get("user_id") is None
        key = name.lower()
        current = unique.get(key)
        if current is None or (current.is_default and not is_default):
            suggestion = suggested_from_leaflet(name, item.get("sections"))
            unique[key] = LeafletCatalogItem(
                drug_name=name,
                is_default=is_default,
                suggested_doses_per_day=int(suggestion["doses_per_day"]),
                suggested_interval_hours=float(suggestion["interval_hours"]),
                suggested_quantity=suggestion.get("quantity"),
            )
    return sorted(unique.values(), key=lambda item: item.drug_name.lower())


@router.get("", response_model=list[LeafletResponse])
async def get_available_leaflets(current_user: dict = Depends(get_current_user)):
    """Afișează toate prospectele accesibile: cele DEFAULT + cele Custom ale utilizatorului conectat."""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    # Selectează prospectele globale (user_id IS NULL) SAU cele ale utilizatorului curent
    res = supabase.table("leaflets").select("*").or_(f"user_id.is.null,user_id.eq.{user_id}").execute()
    
    return [
        LeafletResponse(
            id=str(item["id"]),
            user_id=str(item["user_id"]) if item.get("user_id") else None,
            drug_name=item["drug_name"],
            leaflet_text=item["leaflet_text"],
            is_default=(item.get("user_id") is None),
            sections=item.get("sections"),
            created_at=str(item["created_at"])
        )
        for item in res.data
    ]

@router.post("", response_model=LeafletResponse)
async def create_custom_leaflet(req: LeafletCreateRequest, current_user: dict = Depends(get_current_user)):
    """Adaugă un prospect custom și îi generează automat indexul vectorial (embedding)."""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    drug_name = req.drug_name.strip()
    
    existing = supabase.table("leaflets").select("id").eq("user_id", user_id).ilike("drug_name", drug_name).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already added a custom leaflet for this medication.",
        )

    embedding_vector = None
    try:
        embedding_vector = await RAGService.get_embedding(req.leaflet_text)
    except Exception:
        embedding_vector = None

    sections = dict(req.sections or {})
    dosing = validate_dosing(req.dosing.model_dump() if req.dosing else None)
    if dosing:
        sections["4.2"] = posology_sentence(dosing)
    if req.side_effects and req.side_effects.strip():
        sections["4.8"] = req.side_effects.strip()
    if req.interactions and req.interactions.strip():
        sections["4.5"] = req.interactions.strip()

    payload = {
        "user_id": user_id,
        "drug_name": drug_name,
        "leaflet_text": req.leaflet_text,
        "sections": sections,
    }
    if embedding_vector is not None:
        payload["embedding"] = embedding_vector

    res = supabase.table("leaflets").insert(payload).execute()
    
    created = res.data[0]
    return LeafletResponse(
        id=str(created["id"]),
        user_id=str(created["user_id"]),
        drug_name=created["drug_name"],
        leaflet_text=created["leaflet_text"],
        is_default=False,
        sections=created.get("sections"),
        created_at=str(created["created_at"])
    )