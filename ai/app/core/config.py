from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Orbis AI API"
    ai_database_url: str
    ai_database_pool_min_size: int = 1
    ai_database_pool_max_size: int = 10
    ai_internal_token: str | None = None
    ai_embedding_model: str = "intfloat/multilingual-e5-base"
    ai_embedding_dimension: int = 768
    ai_embedding_device: str = "cpu"
    ai_embedding_batch_size: int = 4
    ai_embedding_max_length: int = 512
    ai_embedding_document_prefix: str = "passage:"
    ai_embedding_query_prefix: str = "query:"
    ai_chunk_size: int = 1000
    ai_chunk_overlap: int = 120

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

settings = Settings()
