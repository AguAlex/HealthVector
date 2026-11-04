import httpx
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.database import get_supabase_client
from app.services.pii_filter import PIIFilter
from fastapi import HTTPException, status

class RAGService:
    @staticmethod
    async def get_embedding(text: str) -> List[float]:
        """Generare vector embedding folosind OpenAI sau fallback mock pentru testare."""
        if not settings.LLM_API_KEY or settings.LLM_API_KEY == "your_llm_provider_api_key":
            # Dummy embedding 1536 dim pentru testare fără cheie reală
            return [0.01] * 1536
            
        client = AsyncOpenAI(api_key=settings.LLM_API_KEY)
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding

    @classmethod
    async def search_leaflets(cls, query: str, user_id: str, match_count: int = 3) -> List[Dict[str, Any]]:
        """Interoghează Supabase pgvector pentru prospectele accesibile utilizatorului."""
        sanitized_query = PIIFilter.sanitize_prompt(query)
        supabase = get_supabase_client()
        
        try:
            query_embedding = await cls.get_embedding(sanitized_query)
            
            # Apel funcție RPC `match_leaflets` definită în schema SQL
            rpc_res = supabase.rpc(
                "match_leaflets",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.1,  # prag de similitudine
                    "match_count": match_count,
                    "p_user_id": user_id
                }
            ).execute()
            
            if rpc_res.data:
                return rpc_res.data
                
            # Fallback în caz că nu există vectori indexați: căutare text clasică
            fallback_res = supabase.table("leaflets") \
                .select("*") \
                .or_(f"user_id.is.null,user_id.eq.{user_id}") \
                .ilike("leaflet_text", f"%{sanitized_query}%") \
                .limit(match_count) \
                .execute()
                
            return fallback_res.data or []
            
        except Exception as e:
            # Tratare eroare sau rate-limit
            return []