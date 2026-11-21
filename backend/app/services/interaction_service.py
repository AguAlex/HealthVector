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
    {
        "drug_a": "warfarin",
        "drug_b": "fluoxetine",
        "severity": "high",
        "warning_message": "High-severity interaction: Fluoxetine can increase Warfarin effect and bleeding risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "warfarin",
        "drug_b": "ciprofloxacin",
        "severity": "high",
        "warning_message": "High-severity interaction: Ciprofloxacin may potentiate Warfarin and increase INR. Consult a healthcare professional.",
    },
    {
        "drug_a": "aspirin",
        "drug_b": "ibuprofen",
        "severity": "moderate",
        "warning_message": "Potential interaction: Ibuprofen may reduce the antiplatelet effect of Aspirin and increase gastrointestinal bleeding risk.",
    },
    {
        "drug_a": "aspirin",
        "drug_b": "sertraline",
        "severity": "high",
        "warning_message": "High-severity interaction: Aspirin with Sertraline increases bleeding risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "ibuprofen",
        "drug_b": "lisinopril",
        "severity": "high",
        "warning_message": "High-severity interaction: Ibuprofen may reduce Lisinopril effect and increase kidney-injury risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "ibuprofen",
        "drug_b": "methotrexate",
        "severity": "high",
        "warning_message": "High-severity interaction: Ibuprofen can raise Methotrexate levels and toxicity. Consult a healthcare professional.",
    },
    {
        "drug_a": "ibuprofen",
        "drug_b": "lithium",
        "severity": "high",
        "warning_message": "High-severity interaction: Ibuprofen can reduce Lithium clearance and cause toxicity. Consult a healthcare professional.",
    },
    {
        "drug_a": "lisinopril",
        "drug_b": "spironolactone",
        "severity": "high",
        "warning_message": "High-severity interaction: Lisinopril with Spironolactone can cause hyperkalemia. Consult a healthcare professional.",
    },
    {
        "drug_a": "lisinopril",
        "drug_b": "potassium chloride",
        "severity": "high",
        "warning_message": "High-severity interaction: Lisinopril with Potassium chloride can cause hyperkalemia. Consult a healthcare professional.",
    },
    {
        "drug_a": "spironolactone",
        "drug_b": "potassium chloride",
        "severity": "high",
        "warning_message": "High-severity interaction: Spironolactone with Potassium chloride can cause dangerous hyperkalemia. Consult a healthcare professional.",
    },
    {
        "drug_a": "simvastatin",
        "drug_b": "clarithromycin",
        "severity": "high",
        "warning_message": "High-severity interaction: Clarithromycin can greatly increase Simvastatin exposure and rhabdomyolysis risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "simvastatin",
        "drug_b": "amiodarone",
        "severity": "moderate",
        "warning_message": "Potential interaction: Amiodarone may increase Simvastatin levels. Review the dose with a pharmacist.",
    },
    {
        "drug_a": "clarithromycin",
        "drug_b": "digoxin",
        "severity": "high",
        "warning_message": "High-severity interaction: Clarithromycin can raise Digoxin levels. Consult a healthcare professional.",
    },
    {
        "drug_a": "amiodarone",
        "drug_b": "digoxin",
        "severity": "high",
        "warning_message": "High-severity interaction: Amiodarone increases Digoxin concentration. Consult a healthcare professional.",
    },
    {
        "drug_a": "fluoxetine",
        "drug_b": "sertraline",
        "severity": "high",
        "warning_message": "High-severity interaction: Combining Fluoxetine and Sertraline increases serotonin-syndrome risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "fluoxetine",
        "drug_b": "lithium",
        "severity": "moderate",
        "warning_message": "Potential interaction: Fluoxetine with Lithium may increase serotonergic and neurotoxicity risk. Review with a pharmacist.",
    },
    {
        "drug_a": "sertraline",
        "drug_b": "lithium",
        "severity": "high",
        "warning_message": "High-severity interaction: Sertraline with Lithium increases serotonin-syndrome and neurotoxicity risk. Consult a healthcare professional.",
    },
    {
        "drug_a": "ciprofloxacin",
        "drug_b": "amiodarone",
        "severity": "high",
        "warning_message": "High-severity interaction: Ciprofloxacin with Amiodarone can prolong QT interval. Consult a healthcare professional.",
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
