from app.core.database import get_supabase_client
from app.services.rag_service import RAGService

class LeafletIndexerService:
    @staticmethod
    async def index_unindexed_leaflets():
        """Găsește toate prospectele neindexate (embedding NULL) și le generează vectorii."""
        supabase = get_supabase_client()
        
        # Interoghează prospectele fără embedding
        res = supabase.table("leaflets").select("id, drug_name, leaflet_text").filter("embedding", "is", "null").execute()
        
        if not res.data:
            print("Toate prospectele sunt deja indexate vectorial.")
            return

        print(f"Se indexează {len(res.data)} prospecte...")
        
        for item in res.data:
            leaflet_id = item["id"]
            text = item["leaflet_text"]
            
            # Calculează vectorul
            vector = await RAGService.get_embedding(text)
            
            # Salvează vectorul în Supabase
            supabase.table("leaflets").update({"embedding": vector}).eq("id", leaflet_id).execute()
            print(f"Prospectul '{item['drug_name']}' a fost indexat cu succes.")