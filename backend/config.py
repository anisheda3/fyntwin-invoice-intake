# pydantic-settings, loads .env
"""
Configuration loader.
All settings come from .env via pydantic-settings.
Zero hardcoded URLs, API keys, or model names anywhere in the codebase.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Service metadata
    service_name: str = "Fyntwin Invoice Intake System"
    service_version: str = "1.0.0"

    # ERPNext — loaded from .env, never hardcoded
    erpnext_base_url: str
    erpnext_api_key: str
    erpnext_api_secret: str

    # Google Gemini — loaded from .env
    gemini_api_key: str

    # AI Models — all swappable via .env
    intake_model: str = "gemini-2.0-flash"
    validator_model: str = "gemini-2.0-flash"
    action_model: str = "gemini-2.0-flash"
    demo_mode: bool = False

    # Embedding model for RAG
    embedding_model: str = "models/gemini-embedding-001"

    # Agno SQLite storage path
    agno_storage_path: str = "./data/agno_sessions.db"

    # CORS origins
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]


@lru_cache()
def get_settings() -> Settings:
    return Settings()