from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    JWT_SECRET_KEY: str = "super_secret_jwt_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 zile
    LLM_API_KEY: str
    LLM_PROVIDER: str = "openai"
    ENVIRONMENT: str = "development"
    MEDICAL_DISCLAIMER: str = "Prototype only. Not professional medical advice."

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()