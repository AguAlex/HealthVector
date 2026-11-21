from typing import Any

from app.core.config import settings
from app.core.database import get_supabase_client
from app.services.llm_adapter import LLMAdapter
from app.services.pii_filter import PIIFilter

MATCH_THRESHOLD = 0.35

_SECTION_HINTS = {
    "4.8": (
        "side effect", "adverse", "reacții", "reactii", "rash", "bleeding",
        "efecte secundare", "efect secundar", "secundar", "nedorite", "undesirable",
    ),
    "4.5": ("interact", "warfarin", "together", "combination", "interacț", "cu alt"),
    "4.2": ("dose", "posolog", "food", "milk", "how much", "when", "schedule", "doza", "doză"),
    "4.1": ("indicat", "used for", "what is", "pentru ce"),
}


class RAGService:
    @staticmethod
    async def get_embedding(text: str) -> list[float]:
        return await LLMAdapter.embed(text)

    @staticmethod
    def pick_section(query: str, sections: dict | None) -> tuple[str | None, str | None]:
        lowered = query.lower()
        ranked: list[tuple[int, str]] = []
        for key, hints in _SECTION_HINTS.items():
            score = sum(1 for hint in hints if hint in lowered)
            if score > 0:
                ranked.append((score, key))
        ranked.sort(reverse=True)

        if ranked:
            key = ranked[0][1]
            if isinstance(sections, dict) and sections.get(key):
                return key, str(sections.get(key) or "")
            return key, None

        if not isinstance(sections, dict) or not sections:
            return None, None
        for preferred in ("4.8", "4.2", "4.1", "4.5"):
            if preferred in sections:
                return preferred, str(sections[preferred])
        key = next(iter(sections))
        return str(key), str(sections[key])

    @classmethod
    async def search_leaflets(cls, query: str, user_id: str, match_count: int = 3) -> list[dict[str, Any]]:
        sanitized_query = PIIFilter.sanitize_prompt(query)
        supabase = get_supabase_client()

        by_name = cls._match_by_drug_name(supabase, sanitized_query, user_id, match_count)
        if by_name:
            return by_name

        try:
            query_embedding = await cls.get_embedding(sanitized_query)
            rpc_res = supabase.rpc(
                "match_leaflets",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": MATCH_THRESHOLD,
                    "match_count": match_count,
                    "p_user_id": user_id,
                },
            ).execute()
            rows = rpc_res.data or []
            if rows:
                return rows

            fallback_res = (
                supabase.table("leaflets")
                .select("*")
                .or_(f"user_id.is.null,user_id.eq.{user_id}")
                .ilike("leaflet_text", f"%{sanitized_query}%")
                .limit(match_count)
                .execute()
            )
            return fallback_res.data or []
        except Exception:
            return []

    @staticmethod
    def _match_by_drug_name(supabase, query: str, user_id: str, match_count: int) -> list[dict[str, Any]]:
        lowered = (query or "").lower()
        res = (
            supabase.table("leaflets")
            .select("*")
            .or_(f"user_id.is.null,user_id.eq.{user_id}")
            .execute()
        )
        hits: list[tuple[int, dict[str, Any]]] = []
        for item in res.data or []:
            name = str(item.get("drug_name") or "").strip().lower()
            if len(name) < 3 or name not in lowered:
                continue
            hits.append((len(name), item))
        hits.sort(reverse=True)
        return [item for _, item in hits[:match_count]]

    @classmethod
    async def grounded_context(cls, query: str, user_id: str) -> dict[str, Any]:
        results = await cls.search_leaflets(query, user_id=user_id)
        if not results:
            return {"found": False, "context": "No supporting leaflet content was retrieved."}

        first = results[0]
        section_id, section_text = cls.pick_section(query, first.get("sections"))
        context_text = section_text or first.get("leaflet_text") or ""
        return {
            "found": True,
            "drug_name": first.get("drug_name"),
            "is_custom": first.get("user_id") is not None,
            "context_text": context_text,
            "leaflet_text": first.get("leaflet_text"),
            "sections": first.get("sections"),
            "section_id": section_id,
            "citation": f"{first.get('drug_name')} Leaflet §{section_id}" if section_id else f"{first.get('drug_name')} Leaflet",
        }
