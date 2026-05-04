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
    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.model = SentenceTransformer(config.model_name, device=config.device)
        self.model.max_seq_length = config.max_length

    def encode_passages(self, texts: list[str]) -> list[list[float]]:
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
