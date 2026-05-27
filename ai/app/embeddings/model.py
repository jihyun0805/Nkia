# 인수인계 메모: 임베딩 계층입니다. 원문을 검색 가능한 청크로 나누고, 문서/질문 prefix를 붙여 같은 벡터 공간에 올립니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from dataclasses import dataclass

from sentence_transformers import SentenceTransformer

from app.core.config import Settings


@dataclass(frozen=True)
class EmbeddingConfig:
    model_name: str
    dimension: int
    device: str
    batch_size: int
    max_length: int
    document_prefix: str
    query_prefix: str

    @classmethod
    def from_settings(cls, settings: Settings) -> "EmbeddingConfig":
        return cls(
            model_name=settings.ai_embedding_model,
            dimension=settings.ai_embedding_dimension,
            device=settings.ai_embedding_device,
            batch_size=settings.ai_embedding_batch_size,
            max_length=settings.ai_embedding_max_length,
            document_prefix=settings.ai_embedding_document_prefix,
            query_prefix=settings.ai_embedding_query_prefix,
        )


class EmbeddingModel:
    def __init__(self, config: EmbeddingConfig) -> None:
        self.config = config
        # SentenceTransformer는 모델 로딩 비용이 크므로 FastAPI lifespan에서 한 번만 생성한다.
        self.model = SentenceTransformer(config.model_name, device=config.device)
        self.model.max_seq_length = config.max_length

    def encode_passages(self, texts: list[str]) -> list[list[float]]:
        # 문서와 질문에 서로 다른 prefix를 붙여 검색 모델이 역할을 구분하도록 맞춘다.
        return self._encode([self._with_prefix(self.config.document_prefix, text) for text in texts])

    def encode_query(self, text: str) -> list[float]:
        return self._encode([self._with_prefix(self.config.query_prefix, text)])[0]

    def _encode(self, texts: list[str]) -> list[list[float]]:
        embeddings = self.model.encode(
            texts,
            batch_size=self.config.batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        vectors = embeddings.tolist()
        for vector in vectors:
            # DB pgvector 컬럼 차원과 모델 출력 차원이 다르면 색인/검색이 모두 실패하므로 즉시 감지한다.
            if len(vector) != self.config.dimension:
                raise ValueError(
                    f"Embedding dimension mismatch: expected {self.config.dimension}, got {len(vector)}"
                )
        return vectors

    @staticmethod
    def _with_prefix(prefix: str, text: str) -> str:
        stripped_prefix = prefix.strip()
        stripped_text = text.strip()
        if not stripped_prefix:
            return stripped_text
        return f"{stripped_prefix} {stripped_text}"
