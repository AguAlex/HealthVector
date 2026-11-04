import re

class PIIFilter:
    """NFR-03: Ștergerea datelor cu caracter personal înainte de LLM."""
    
    @staticmethod
    def sanitize_prompt(text: str) -> str:
        # Mascare CNP (13 cifre)
        text = re.sub(r'\b[1-8]\d{12}\b', '[MASKED_CNP]', text)
        # Mascare Email
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[MASKED_EMAIL]', text)
        # Mascare Telefon
        text = re.sub(r'\b(?:\+?40|0)?7\d{8}\b', '[MASKED_PHONE]', text)
        return text