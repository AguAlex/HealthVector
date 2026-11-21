"""Idempotent seed for default leaflets and known interactions."""

from app.core.database import get_supabase_client
from app.services.interaction_service import _FALLBACK_PAIRS

LEAFLETS = [
    {
        "drug_name": "Simvastatin",
        "leaflet_text": "Simvastatina este un statin indicat pentru hipercolesterolemie. Doza uzuală se administrează seara. Asocierea cu inhibitori puternici de CYP3A4, inclusiv claritromicina, este contraindicată.",
        "sections": {
            "4.1": "Indicații: Hipercolesterolemie, prevenție cardiovasculară",
            "4.2": "Posologie: O dată pe zi, de obicei seara, la 18:00",
            "4.5": "Interacțiuni: Interacțiune majoră cu Clarithromycin; precauție cu Amiodarone",
            "4.8": "Reacții adverse: Mialgie, rhabdomyoliză rară, creșterea transaminazelor",
        },
    },
    {
        "drug_name": "Clarithromycin",
        "leaflet_text": "Claritromicina este un macrolid utilizat în infecții respiratorii și eradicarea Helicobacter pylori. Inhibă CYP3A4 și P-glicoproteina. Doza uzuală la adulți este de 250-500 mg la 12 ore.",
        "sections": {
            "4.1": "Indicații: Infecții bacteriene ale tractului respirator, H. pylori",
            "4.2": "Posologie: Adulți 250-500 mg la 12 ore",
            "4.5": "Interacțiuni: Crește expunerea la Simvastatin și Digoxin; precauție cu Amiodarone",
            "4.8": "Reacții adverse: Gust metalic, diaree, prelungirea QT",
        },
    },
    {
        "drug_name": "Fluoxetine",
        "leaflet_text": "Fluoxetina este un ISRS indicat în depresie și tulburare obsesiv-compulsivă. Se administrează de obicei o dată pe zi dimineața. Potențează efectul anticoagulantelor și al altor serotonergice.",
        "sections": {
            "4.1": "Indicații: Depresie, tulburare obsesiv-compulsivă",
            "4.2": "Posologie: O dată pe zi, de obicei dimineața",
            "4.5": "Interacțiuni: Interacțiune majoră cu Warfarina; sindrom serotoninergic cu Sertraline sau Lithium",
            "4.8": "Reacții adverse: Insomnie, greață, disfuncție sexuală",
        },
    },
    {
        "drug_name": "Sertraline",
        "leaflet_text": "Sertralina este un ISRS indicat în depresie și tulburări de anxietate. Doza se administrează o dată pe zi. Asocierea cu antiagregante sau alte ISRS crește riscul de sângerare și de sindrom serotoninergic.",
        "sections": {
            "4.1": "Indicații: Depresie, tulburare de panică, TOC",
            "4.2": "Posologie: O dată pe zi",
            "4.5": "Interacțiuni: Interacțiune majoră cu Aspirina; sindrom serotoninergic cu Fluoxetine sau Lithium",
            "4.8": "Reacții adverse: Greață, diaree, insomnie",
        },
    },
    {
        "drug_name": "Digoxin",
        "leaflet_text": "Digoxina este un glicozid cardiac folosit în fibrilație atrială și insuficiență cardiacă. Are fereastră terapeutică îngustă. Nivelurile pot crește la asociere cu Amiodarone sau Clarithromycin.",
        "sections": {
            "4.1": "Indicații: Fibrilație atrială, insuficiență cardiacă",
            "4.2": "Posologie: O dată pe zi",
            "4.5": "Interacțiuni: Interacțiune majoră cu Amiodarone și Clarithromycin — risc de toxicitate digitalică",
            "4.8": "Reacții adverse: Greață, aritmii, tulburări vizuale",
        },
    },
    {
        "drug_name": "Lisinopril",
        "leaflet_text": "Lisinoprilul este un inhibitor ECA indicat în hipertensiune și insuficiență cardiacă. Doza se administrează o dată pe zi. Asocierea cu AINS, spironolactonă sau suplimente de potasiu crește riscul de hiperpotasemie și afectare renală.",
        "sections": {
            "4.1": "Indicații: Hipertensiune arterială, insuficiență cardiacă",
            "4.2": "Posologie: O dată pe zi",
            "4.5": "Interacțiuni: Interacțiune majoră cu Ibuprofen, Spironolactone și Potassium chloride",
            "4.8": "Reacții adverse: Tuse, hipotensiune, hiperpotasemie",
        },
    },
    {
        "drug_name": "Spironolactone",
        "leaflet_text": "Spironolactona este un diuretic economisitor de potasiu indicat în insuficiență cardiacă și hiperaldosteronism. Asocierea cu inhibitori ECA sau potasiu poate produce hiperpotasemie severă.",
        "sections": {
            "4.1": "Indicații: Insuficiență cardiacă, hiperaldosteronism, edeme",
            "4.2": "Posologie: O dată pe zi",
            "4.5": "Interacțiuni: Interacțiune majoră cu Lisinopril și Potassium chloride",
            "4.8": "Reacții adverse: Hiperpotasemie, ginecomastie, hipotensiune",
        },
    },
    {
        "drug_name": "Potassium chloride",
        "leaflet_text": "Clorura de potasiu este un supliment electrolitic pentru hipokaliemie. Nu se asociază cu diuretice economisitoare de potasiu sau inhibitori ECA fără monitorizare.",
        "sections": {
            "4.1": "Indicații: Corectarea hipokaliemiei",
            "4.2": "Posologie: De obicei de două ori pe zi",
            "4.5": "Interacțiuni: Interacțiune majoră cu Lisinopril și Spironolactone — hiperpotasemie",
            "4.8": "Reacții adverse: Iritație gastrică, hiperpotasemie",
        },
    },
    {
        "drug_name": "Methotrexate",
        "leaflet_text": "Metotrexatul este un antimetabolit folosit în doze mici în poliartrită reumatoidă. Eliminarea renală poate fi redusă de AINS, cu risc de toxicitate.",
        "sections": {
            "4.1": "Indicații: Poliartrită reumatoidă, psoriazis",
            "4.2": "Posologie: O dată pe zi în acest prototip (în practică adesea săptămânal)",
            "4.5": "Interacțiuni: Interacțiune majoră cu Ibuprofen — risc de toxicitate",
            "4.8": "Reacții adverse: Mielosupresie, mucozită, hepatotoxicitate",
        },
    },
    {
        "drug_name": "Ciprofloxacin",
        "leaflet_text": "Ciprofloxacina este o fluorochinolonă. Poate prelungi QT și poate potența warfarina. Doza uzuală la adulți este de două ori pe zi.",
        "sections": {
            "4.1": "Indicații: Infecții urinare și digestive selectate",
            "4.2": "Posologie: De două ori pe zi",
            "4.5": "Interacțiuni: Interacțiune majoră cu Warfarina și Amiodarone",
            "4.8": "Reacții adverse: Tendinopatie, prelungirea QT, diaree",
        },
    },
    {
        "drug_name": "Amiodarone",
        "leaflet_text": "Amiodarona este un antiaritimic de clasă III. Inhibă multiple CYP și poate crește concentrațiile de digoxină și statine. Asocierea cu fluorochinolone crește riscul de QT prelungit.",
        "sections": {
            "4.1": "Indicații: Aritmii ventriculare, fibrilație atrială",
            "4.2": "Posologie: O dată pe zi după faza de încărcare",
            "4.5": "Interacțiuni: Interacțiune majoră cu Digoxin și Ciprofloxacin; precauție cu Simvastatin",
            "4.8": "Reacții adverse: Toxicitate tiroidiană și pulmonară, prelungirea QT",
        },
    },
    {
        "drug_name": "Lithium",
        "leaflet_text": "Litiul este un stabilizator al dispoziției cu fereastră terapeutică îngustă. AINS reduc clearance-ul renal. Asocierea cu ISRS crește riscul de sindrom serotoninergic.",
        "sections": {
            "4.1": "Indicații: Tulburare bipolară",
            "4.2": "Posologie: De obicei de două ori pe zi",
            "4.5": "Interacțiuni: Interacțiune majoră cu Ibuprofen și Sertraline; precauție cu Fluoxetine",
            "4.8": "Reacții adverse: Tremor, polidipsie, toxicitate la niveluri ridicate",
        },
    },
]


def main() -> None:
    supabase = get_supabase_client()
    existing = (
        supabase.table("leaflets")
        .select("drug_name")
        .is_("user_id", "null")
        .execute()
    )
    present = {str(item["drug_name"]).strip().lower() for item in (existing.data or [])}
    inserted_leaflets = 0
    for leaflet in LEAFLETS:
        if leaflet["drug_name"].lower() in present:
            continue
        supabase.table("leaflets").insert({
            "user_id": None,
            "drug_name": leaflet["drug_name"],
            "leaflet_text": leaflet["leaflet_text"],
            "sections": leaflet["sections"],
        }).execute()
        inserted_leaflets += 1

    existing_pairs = supabase.table("known_interactions").select("drug_a, drug_b").execute()
    present_pairs = {
        (str(item["drug_a"]).lower(), str(item["drug_b"]).lower())
        for item in (existing_pairs.data or [])
    }
    inserted_pairs = 0
    for pair in _FALLBACK_PAIRS:
        key = (pair["drug_a"], pair["drug_b"])
        if key in present_pairs:
            continue
        supabase.table("known_interactions").insert({
            "drug_a": pair["drug_a"],
            "drug_b": pair["drug_b"],
            "severity": pair["severity"],
            "warning_message": pair["warning_message"],
        }).execute()
        inserted_pairs += 1

    leaflets = supabase.table("leaflets").select("drug_name").is_("user_id", "null").execute()
    interactions = supabase.table("known_interactions").select("id").execute()
    print(
        f"Seeded {inserted_leaflets} leaflets and {inserted_pairs} interactions. "
        f"Catalog now has {len(leaflets.data or [])} default leaflets and "
        f"{len(interactions.data or [])} known pairs."
    )


if __name__ == "__main__":
    main()
