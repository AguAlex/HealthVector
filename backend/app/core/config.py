from pydantic_settings import BaseSettings

_PROVIDER_BASE_URLS = {
    "openai": None,
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
}
_PROVIDER_CHAT_MODELS = {
    "openai": "gpt-4o-mini",
    "groq": "openai/gpt-oss-20b",
    "openrouter": "openai/gpt-oss-20b:free",
    "gemini": "gemini-2.0-flash",
}


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    LLM_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = ""
    LLM_BASE_URL: str = ""
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

    @property
    def llm_provider(self) -> str:
        return (self.LLM_PROVIDER or "openai").strip().lower()

    @property
    def llm_base_url(self) -> str | None:
        custom = (self.LLM_BASE_URL or "").strip()
        if custom:
            return custom
        return _PROVIDER_BASE_URLS.get(self.llm_provider)

    @property
    def llm_chat_model(self) -> str:
        custom = (self.LLM_MODEL or "").strip()
        if custom:
            return custom
        return _PROVIDER_CHAT_MODELS.get(self.llm_provider, "gpt-4o-mini")

    @property
    def llm_supports_openai_embeddings(self) -> bool:
        return self.llm_provider == "openai" and not (self.LLM_BASE_URL or "").strip()


settings = Settings()
