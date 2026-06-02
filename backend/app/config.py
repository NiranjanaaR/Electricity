from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://obxai:obxai@localhost:5432/obxai"
    analysis_lookback_days: int = 180
    schedule_hour: int = 7
    schedule_minute: int = 0
    timezone: str = "Europe/Oslo"
    allow_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
