from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Orbis AI API"
    ai_database_url: str

    model_config = SettingsConfigDict(env_file=None, extra="ignore")


settings = Settings()
