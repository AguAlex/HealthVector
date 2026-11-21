from typing import Any

from app.core.database import get_supabase_client

_FALLBACK_PAIRS = [
    {
        "drug_a": "warfarin",
        "drug_b": "aspirin",
        "severity": "high",
        "warning_message": "High-severity interaction: Warfarin and Aspirin increase bleeding risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "warfarin",
        "drug_b": "ibuprofen",
        "severity": "high",
        "warning_message": "High-severity interaction: Warfarin and Ibuprofen increase gastrointestinal bleeding risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "warfarin",
        "drug_b": "paracetamol",
        "severity": "moderate",
        "warning_message": "Potential interaction: high-dose Paracetamol may potentiate Warfarin. Review with a pharmacist.",
    },
]


class InteractionService:
    @staticmethod
    def _pairs() -> list[dict[str, Any]]:
        supabase = get_supabase_client()
        try:
            res = supabase.table("known_interactions").select("*").execute()
            if res.data:
                return res.data
        except Exception:
            pass
        return _FALLBACK_PAIRS

    @classmethod
    def check(cls, drug_names: list[str]) -> dict[str, Any]:
        normalized = [name.strip().lower() for name in drug_names if name and name.strip()]
        unique = list(dict.fromkeys(normalized))
        hits: list[dict[str, Any]] = []

        for pair in cls._pairs():
            a = pair["drug_a"].lower()
            b = pair["drug_b"].lower()
            if a in unique and b in unique:
                hits.append(pair)

        if not hits:
            return {
                "has_interaction": False,
                "severity": "none",
                "warning_message": None,
                "affected_drugs": [],
                "matches": [],
            }

        severity = "high" if any(item["severity"] == "high" for item in hits) else "moderate"
        messages = [item["warning_message"] for item in hits]
        affected: list[str] = []
        for item in hits:
            for name in (item["drug_a"], item["drug_b"]):
                title = name.title()
                if title not in affected:
                    affected.append(title)

        return {
            "has_interaction": True,
            "severity": severity,
            "warning_message": " ".join(messages),
            "affected_drugs": affected,
            "matches": hits,
        }
