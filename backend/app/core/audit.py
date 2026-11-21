import logging

logger = logging.getLogger("healthvector.audit")

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def audit(event_type: str, status: str, **fields: object) -> None:
    """NFR-13: structured logs without PII or secrets."""
    parts = [f"event={event_type}", f"status={status}"]
    for key, value in fields.items():
        if value is None:
            continue
        parts.append(f"{key}={value}")
    logger.info(" ".join(parts))
