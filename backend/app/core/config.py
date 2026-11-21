from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    LLM_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"
    LLM_ENABLED: bool = True
    ENVIRONMENT: str = "development"
    MEDICAL_DISCLAIMER: str = "Prototype only. Not professional medical advice."
    SAFE_FALLBACK_MESSAGE: str = (
        "Prototype only. Not professional medical advice. "
        "The assistant is unavailable. Read the official leaflet or ask a pharmacist."
    )

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def llm_configured(self) -> bool:
        key = (self.LLM_API_KEY or "").strip()
        return bool(self.LLM_ENABLED and key and key != "your_llm_provider_api_key")


settings = Settings()
