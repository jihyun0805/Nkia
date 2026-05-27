# 인수인계 메모: AI 챗봇 공통 코드입니다. 다른 계층에서 재사용하는 설정, 보안, 어댑터, 도구 함수를 담습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
    gms_key: str | None = None
    gms_chat_completions_url: str = "https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions"
    gms_chat_model: str = "gpt-5-mini"
    gms_timeout_seconds: int = 30
    langgraph_use_official_runtime: bool = True
    langgraph_checkpoint_url: str | None = None
    langgraph_checkpoint_schema: str = "ai"
    ai_enable_draft_actions: bool = False
    postgres_host: str | None = None
    postgres_port: int = 5432
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_db: str | None = None
    postgres_url: str | None = None

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

settings = Settings()
