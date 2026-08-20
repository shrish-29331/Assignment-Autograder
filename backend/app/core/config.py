"""
Centralized application configuration.

Everything that used to be hardcoded in the old project (Mongo URI, secrets,
sample credentials, etc.) is now pulled from environment variables so the
codebase can be safely open-sourced / committed to git. Copy `.env.example`
to `.env` and fill in real values before running.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "autograder"

    # Auth / JWT
    jwt_secret_key: str = "insecure-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    # AI (Google Gemini)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    enable_ai_feedback: bool = True

    # Sandbox limits for running student code
    code_exec_timeout_seconds: int = 8
    code_exec_memory_limit_mb: int = 256

    # CORS
    frontend_origin: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
