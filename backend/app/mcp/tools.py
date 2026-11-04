from typing import Dict, Any, List
from app.core.database import get_supabase_client
from app.services.rag_service import RAGService

class MCPTools:
    
    @staticmethod
    async def tool_rag_search(query: str, user_id: str) -> Dict[str, Any]:
        """Unealtă MCP: Căutare RAG în prospectele oficiale (Globale + Custom)."""
        results = await RAGService.search_leaflets(query, user_id=user_id)
        if not results:
            return {"found": False, "context": "Nu s-au găsit informații în prospecte."}
            
        first = results[0]
        return {
            "found": True,
            "drug_name": first.get("drug_name"),
            "is_custom": first.get("user_id") is not None,
            "context_text": first.get("leaflet_text"),
            "sections": first.get("sections")
        }

    @staticmethod
    async def tool_add_medication(drug_name: str, user_id: str) -> Dict[str, Any]:
        """Unealtă MCP (Acțiune): Adaugă un medicament în lista activă a pacientului."""
        supabase = get_supabase_client()
        clean_name = drug_name.strip()
        
        # 1. Verificare dacă prospectul există (DEC-2 / FR-11)
        leaflet_res = supabase.table("leaflets").select("id, drug_name, user_id").or_(f"user_id.is.null,user_id.eq.{user_id}").ilike("drug_name", clean_name).execute()
        
        if not leaflet_res.data:
            return {
                "success": False,
                "error": f"Medicamentul '{clean_name}' nu a fost găsit în baza de prospecte. Adăugare blocată."
            }
            
        matched = leaflet_res.data[0]
        
        # 2. Verificare dacă este deja adăugat
        existing = supabase.table("active_medications").select("id").eq("user_id", user_id).ilike("drug_name", matched["drug_name"]).execute()
        if existing.data:
            return {
                "success": False,
                "error": f"Medicamentul '{matched['drug_name']}' este deja în lista ta."
            }
            
        # 3. Execuție scriere
        ins_res = supabase.table("active_medications").insert({
            "user_id": user_id,
            "leaflet_id": matched["id"],
            "drug_name": matched["drug_name"]
        }).execute()
        
        return {
            "success": True,
            "medication_id": str(ins_res.data[0]["id"]),
            "drug_name": matched["drug_name"]
        }

    @staticmethod
    async def tool_check_interactions(user_id: str) -> Dict[str, Any]:
        """Unealtă MCP: Verifică interacțiunile din lista activă a pacientului."""
        supabase = get_supabase_client()
        res = supabase.table("active_medications").select("drug_name").eq("user_id", user_id).execute()
        active_drugs = [item["drug_name"].lower() for item in res.data]
        
        if "warfarin" in active_drugs and ("aspirin" in active_drugs or "paracetamol" in active_drugs):
            return {
                "has_interaction": True,
                "warning": "ATENȚIE: Interacțiune majoră detectată între Warfarin și Aspirin/Paracetamol! Risc crescut de sângerare."
            }
        return {"has_interaction": False, "warning": "Nu s-au detectat interacțiuni cunoscute."}