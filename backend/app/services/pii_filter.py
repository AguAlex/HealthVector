import re

_SECRET_PATTERNS = [
    (re.compile(r"\b[1-8]\d{12}\b"), "[MASKED_CNP]"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[MASKED_EMAIL]"),
    (re.compile(r"\b(?:\+?40|0)?7\d{8}\b"), "[MASKED_PHONE]"),
    (re.compile(r"\bsk-[A-Za-z0-9]{10,}\b"), "[MASKED_KEY]"),
    (re.compile(r"\bBearer\s+[A-Za-z0-9._\-]+", re.I), "[MASKED_TOKEN]"),
    (re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I), "[MASKED_ID]"),
]


class PIIFilter:
    """NFR-03 / NFR-11: strip identifiers and secrets before LLM use."""

    @staticmethod
    def sanitize_prompt(text: str) -> str:
        sanitized = text or ""
        for pattern, replacement in _SECRET_PATTERNS:
            sanitized = pattern.sub(replacement, sanitized)
        return sanitized
