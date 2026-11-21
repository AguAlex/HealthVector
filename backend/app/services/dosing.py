import re
from typing import Any

from fastapi import HTTPException, status

_TIME_PATTERN = re.compile(r"^(\d{1,2}):(\d{2})(?::\d{2})?$")
_MG_PATTERN = re.compile(r"(\d+\s*(?:[-–]\s*\d+)?\s*mg)", re.IGNORECASE)
_GAP_TOLERANCE_MINUTES = 5

VARIANT_STARTS = (
    ("morning", "Morning start", 7.0),
    ("standard", "Standard day", 8.0),
    ("late", "Later start", 10.0),
    ("evening", "Evening-friendly", None),
)


def normalize_time(value: str) -> str:
    match = _TIME_PATTERN.match((value or "").strip())
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled time must be in HH:MM format.",
        )
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour > 23 or minute > 59:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled time must be a valid clock time.",
        )
    return f"{hour:02d}:{minute:02d}"


def time_to_minutes(value: str) -> int:
    normalized = normalize_time(value)
    hour, minute = normalized.split(":")
    return int(hour) * 60 + int(minute)


def hours_to_hhmm(hours: float) -> str:
    total = int(round(float(hours) * 60)) % (24 * 60)
    if total < 0:
        total += 24 * 60
    return f"{total // 60:02d}:{total % 60:02d}"


def default_interval_hours(doses_per_day: int) -> float:
    if doses_per_day <= 1:
        return 24.0
    return round(24.0 / doses_per_day, 2)


def quantity_from_leaflet(section_42: str | None) -> str | None:
    if not section_42:
        return None
    match = _MG_PATTERN.search(section_42)
    return match.group(1).replace(" ", "") if match else None


def regimen_from_leaflet(drug_name: str, section_42: str | None) -> dict[str, Any]:
    text = (section_42 or "").lower()
    quantity = quantity_from_leaflet(section_42)
    name = (drug_name or "").strip().lower()

    if "4-6" in text or "4–6" in text or "every 4" in text:
        return {"doses_per_day": 4, "interval_hours": 6.0, "quantity": quantity}
    if "6-8" in text or "6–8" in text or "every 6" in text:
        return {"doses_per_day": 3, "interval_hours": 8.0, "quantity": quantity}
    if "12 ore" in text or "12 hours" in text or "la 12" in text or "every 12" in text:
        return {"doses_per_day": 2, "interval_hours": 12.0, "quantity": quantity}
    if "trei ori" in text or "three times" in text:
        return {"doses_per_day": 3, "interval_hours": 8.0, "quantity": quantity}
    if "două ori" in text or "doua ori" in text or "twice" in text or "two times" in text:
        return {"doses_per_day": 2, "interval_hours": 12.0, "quantity": quantity}
    if "o dată" in text or "o data" in text or "once" in text or "seara" in text or "evening" in text:
        return {"doses_per_day": 1, "interval_hours": 24.0, "quantity": quantity}

    fallback_counts = {
        "paracetamol": 3,
        "ibuprofen": 3,
        "clarithromycin": 2,
        "potassium chloride": 2,
        "ciprofloxacin": 2,
        "lithium": 2,
    }
    count = fallback_counts.get(name, 1)
    return {
        "doses_per_day": count,
        "interval_hours": default_interval_hours(count),
        "quantity": quantity,
    }


def _coerce_interval(value: Any, doses_per_day: int) -> float:
    if value is None or value == "":
        return default_interval_hours(doses_per_day)
    try:
        interval = float(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interval between doses must be a number of hours.",
        ) from exc
    if interval < 1 or interval > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interval between doses must be between 1 and 24 hours.",
        )
    return interval


def as_dosing_dict(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    count = raw.get("doses_per_day")
    times_raw = raw.get("times") if isinstance(raw.get("times"), list) else []
    if not isinstance(count, int) or count < 1:
        count = len(times_raw) if times_raw else 0
    if count < 1:
        return None
    count = min(int(count), 6)
    try:
        interval = _coerce_interval(raw.get("interval_hours"), count)
    except HTTPException:
        interval = default_interval_hours(count)
    if count == 1:
        interval = 24.0
    quantity = str(raw.get("quantity") or "").strip() or None
    return {
        "doses_per_day": count,
        "interval_hours": interval,
        "quantity": quantity,
    }


def validate_dosing(raw: Any, *, required: bool = False) -> dict[str, Any] | None:
    if raw is None:
        if required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter how many times a day you take this medication.",
            )
        return None
    if not isinstance(raw, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dosing must be an object.")

    count = raw.get("doses_per_day")
    if count is None and isinstance(raw.get("times"), list) and raw["times"]:
        count = len(raw["times"])
    if count is None:
        if required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter how many times a day you take this medication.",
            )
        return None
    try:
        count = int(count)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doses per day must be a whole number.",
        ) from exc
    if count < 1 or count > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doses per day must be between 1 and 6.",
        )

    interval = _coerce_interval(raw.get("interval_hours"), count)
    if count == 1:
        interval = 24.0
    elif interval * (count - 1) >= 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That interval is too long to fit this many doses in one day.",
        )

    quantity = str(raw.get("quantity") or "").strip()
    if len(quantity) > 80:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity is too long.")
    return {
        "doses_per_day": count,
        "interval_hours": interval,
        "quantity": quantity or None,
    }


def resolve_regimen(dosing: Any, drug_name: str, section_42: str | None) -> dict[str, Any]:
    parsed = as_dosing_dict(dosing)
    if parsed:
        if not parsed.get("quantity"):
            parsed["quantity"] = quantity_from_leaflet(section_42)
        return parsed
    return regimen_from_leaflet(drug_name, section_42)


def resolve_quantity(dosing: Any, section_42: str | None) -> str | None:
    parsed = as_dosing_dict(dosing)
    if parsed and parsed.get("quantity"):
        return parsed["quantity"]
    return quantity_from_leaflet(section_42)


def posology_sentence(dosing: dict[str, Any]) -> str:
    count = int(dosing.get("doses_per_day") or 1)
    interval = dosing.get("interval_hours") or default_interval_hours(count)
    quantity = dosing.get("quantity")
    amount = f"{quantity}, " if quantity else ""
    if count == 1:
        return f"Take {amount}once daily (about every {interval:g} hours)."
    return f"Take {amount}{count} times per day, {interval:g} hours apart."


def suggested_from_leaflet(drug_name: str, sections: Any) -> dict[str, Any]:
    section_42 = None
    if isinstance(sections, dict) and sections.get("4.2") is not None:
        section_42 = str(sections.get("4.2"))
    return regimen_from_leaflet(drug_name, section_42)


def place_series(doses_per_day: int, interval_hours: float, start_hour: float) -> list[str]:
    count = max(1, int(doses_per_day))
    interval = float(interval_hours)
    start = float(start_hour)
    return [hours_to_hhmm(start + index * interval) for index in range(count)]


def _evening_start(doses_per_day: int, interval_hours: float) -> float:
    if doses_per_day <= 1:
        return 18.0
    return max(6.0, 21.0 - (doses_per_day - 1) * interval_hours)


def build_proposals(medications: list[dict[str, Any]]) -> list[dict[str, Any]]:
    proposals: list[dict[str, Any]] = []
    seen: set[tuple[tuple[str, str], ...]] = set()

    def append(key: str, label: str, start_for: Any) -> None:
        doses: list[dict[str, Any]] = []
        for med in medications:
            count = int(med["doses_per_day"])
            interval = float(med["interval_hours"])
            start = _evening_start(count, interval) if start_for is None else float(start_for)
            for scheduled in place_series(count, interval, start):
                doses.append(
                    {
                        "drug_name": med["drug_name"],
                        "scheduled_time": scheduled,
                        "quantity": med.get("quantity"),
                    }
                )
        doses.sort(key=lambda item: (item["scheduled_time"], item["drug_name"]))
        signature = tuple((item["drug_name"], item["scheduled_time"]) for item in doses)
        if signature in seen:
            return
        seen.add(signature)
        first = doses[0]["scheduled_time"] if doses else "—"
        last = doses[-1]["scheduled_time"] if doses else "—"
        proposals.append(
            {
                "key": key,
                "label": label,
                "summary": f"{len(doses)} dose(s) · {first} to {last}",
                "doses": doses,
            }
        )

    for key, label, start in VARIANT_STARTS:
        append(key, label, start)

    extra = (
        ("early", "Early day", 6.0),
        ("brunch", "Mid-morning", 9.0),
        ("noon", "Noon start", 12.0),
        ("afternoon", "Afternoon start", 14.0),
    )
    for key, label, start in extra:
        if len(proposals) >= 4:
            break
        append(key, label, start)

    return proposals[:4]


def interval_violations(
    times: list[str],
    interval_hours: float,
    drug_name: str,
) -> list[str]:
    if len(times) <= 1:
        return []
    required = float(interval_hours) * 60
    minutes = sorted(time_to_minutes(item) for item in times)
    errors: list[str] = []
    for first, second in zip(minutes, minutes[1:]):
        gap = second - first
        if gap + _GAP_TOLERANCE_MINUTES < required:
            errors.append(
                f"{drug_name}: {hours_to_hhmm(first / 60)} and {hours_to_hhmm(second / 60)} "
                f"are only {gap / 60:.1f}h apart; need at least {interval_hours:g}h."
            )
    wrap = minutes[0] + 24 * 60 - minutes[-1]
    if wrap + _GAP_TOLERANCE_MINUTES < required:
        errors.append(
            f"{drug_name}: overnight gap is {wrap / 60:.1f}h; need at least {interval_hours:g}h "
            "between the last and first dose."
        )
    return errors


def validate_plan_times(
    plan_by_drug: dict[str, list[str]],
    regimens: dict[str, dict[str, Any]],
) -> None:
    errors: list[str] = []
    for drug_name, regimen in regimens.items():
        times = plan_by_drug.get(drug_name) or []
        expected = int(regimen["doses_per_day"])
        if len(times) != expected:
            errors.append(f"{drug_name}: expected {expected} dose time(s), got {len(times)}.")
            continue
        errors.extend(interval_violations(times, float(regimen["interval_hours"]), drug_name))
    extra = set(plan_by_drug) - set(regimens)
    for drug_name in sorted(extra):
        errors.append(f"{drug_name} is not in the active medication list.")
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=" ".join(errors))
