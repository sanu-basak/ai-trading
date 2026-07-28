"""Typed application settings loaded from the environment."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    app_name: str = "DEVQUANTIC AI Engine"
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"

    # CORS (the Node API is the primary client)
    cors_origins: str = "http://localhost:4000"

    # Risk defaults used when sizing entries/stops/targets in analysis.
    default_atr_stop_mult: float = 1.5
    default_risk_reward: float = 2.0

    # Optional LLM providers (used by narrative/explanation endpoints, if enabled).
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
