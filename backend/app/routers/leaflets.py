from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import get_supabase_client
from app.core.dependencies import get_current_user
from app.schemas.leaflet import LeafletCreateRequest, LeafletResponse
from app.services.rag_service import RAGService

router = APIRouter(prefix="/api/leaflets", tags=["Leaflets & Knowledge Base"])

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
    
    # 1. Verificare duplicat
    existing = supabase.table("leaflets").select("id").eq("user_id", user_id).ilike("drug_name", drug_name).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ai adăugat deja un prospect custom pentru medicamentul '{drug_name}'."
        )
        
    # 2. Generare INDEX VECTORIAL (Embedding) pentru RAG
    embedding_vector = await RAGService.get_embedding(req.leaflet_text)
    
    # 3. Salvare în DB împreună cu vectorul indexat
    res = supabase.table("leaflets").insert({
        "user_id": user_id,
        "drug_name": drug_name,
        "leaflet_text": req.leaflet_text,
        "sections": req.sections or {},
        "embedding": embedding_vector  # <-- INDEXUL VECTORIAL
    }).execute()
    
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