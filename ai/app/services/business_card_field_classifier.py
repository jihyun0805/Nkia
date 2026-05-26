# 인수인계 메모: 챗봇 서비스 계층입니다. 색인, 검색, 근거 선별, 답변 생성, 추천/비교 등 실제 업무 로직이 모여 있습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import torch
from torch import nn
from transformers import BertModel, BertTokenizer


logger = logging.getLogger(__name__)

MODEL_CONFIDENCE_THRESHOLD = 0.40
BERT_MODEL_TYPE = "bert_multilingual_line_classifier"
BERT_LORA_MODEL_TYPE = "bert_multilingual_line_classifier_lora"
BERT_FEATURE_SIZE = 6
DEFAULT_LORA_ADAPTER_DIR = "bert_lora_adapter"
DEFAULT_LORA_HEAD_PATH = "classifier_head.pt"


@dataclass(frozen=True)
class FieldPrediction:
    # 한 OCR 라인이 어떤 명함 필드로 분류됐는지와 모델 신뢰도를 함께 보관한다.
    field_name: str
    text: str
    confidence: float


class BertBusinessCardFieldClassifier:
    def __init__(
        self,
        *,
        artifact_dir: Path,
        metadata_path: Path,
    ) -> None:
        # 학습 산출물의 메타데이터를 기준으로 토크나이저, 라벨, 모델 구조를 복원한다.
        metadata = _read_metadata(metadata_path)
        self.model_name = str(metadata.get("model_name", "bert-base-multilingual-cased"))
        self.model_type = str(metadata.get("model_type", BERT_MODEL_TYPE))
        self.label_to_idx = _string_int_dict(metadata["label_to_idx"])
        self.idx_to_label = _read_idx_to_label(metadata)
        self.max_length = int(metadata.get("max_length", 64))
        self.confidence_threshold = float(metadata.get("confidence_threshold", MODEL_CONFIDENCE_THRESHOLD))
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.cache_dir = _default_hf_cache_dir()

        self.tokenizer = BertTokenizer.from_pretrained(
            self.model_name,
            cache_dir=str(self.cache_dir),
        )
        self.model = BertLineFieldClassifier(
            model_name=self.model_name,
            num_labels=len(self.label_to_idx),
            cache_dir=self.cache_dir,
            adapter_path=_adapter_path(artifact_dir, metadata) if self.model_type == BERT_LORA_MODEL_TYPE else None,
        ).to(self.device)
        # 일반 fine-tuning 모델과 LoRA adapter 모델의 저장 형식이 달라 로딩 경로를 분리한다.
        if self.model_type == BERT_LORA_MODEL_TYPE:
            head_state = torch.load(_head_path(artifact_dir, metadata), map_location=self.device)
            self.model.load_head_state_dict(head_state)
        else:
            state_dict = torch.load(artifact_dir / "field_classifier.pt", map_location=self.device)
            self.model.load_state_dict(state_dict)
        self.model.eval()

    def predict(self, lines: list[str]) -> list[FieldPrediction]:
        # OCR 라인 배열을 한 줄씩 분류해 필드 후보 목록으로 반환한다.
        if not lines:
            return []

        predictions: list[FieldPrediction] = []
        total_lines = len(lines)

        with torch.inference_mode():
            for line_index, line in enumerate(lines):
                encoded = self.tokenizer(
                    line,
                    padding="max_length",
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                input_ids = encoded["input_ids"].to(self.device)
                attention_mask = encoded["attention_mask"].to(self.device)
                features = extract_bert_features(
                    line,
                    line_index / max(total_lines - 1, 1),
                    min(total_lines, 32) / 32,
                ).unsqueeze(0).to(self.device)
                # 텍스트 임베딩과 줄 위치/문자 패턴 feature를 함께 사용해 명함 필드를 판별한다.
                probabilities = torch.softmax(self.model(input_ids, attention_mask, features), dim=1)[0]
                confidence, label_index = torch.max(probabilities, dim=0)
                field_name = self.idx_to_label[int(label_index.item())]
                if field_name == "none":
                    continue
                predictions.append(
                    FieldPrediction(
                        field_name=field_name,
                        text=line,
                        confidence=float(confidence.item()),
                    )
                )

        return predictions


def predict_business_card_fields(lines: list[str]) -> dict[str, str]:
    # 분류 모델이 없으면 OCR 규칙 기반 후처리만 동작하도록 빈 결과를 반환한다.
    classifier = get_business_card_field_classifier()
    if classifier is None:
        return {}

    confidence_threshold = float(getattr(classifier, "confidence_threshold", MODEL_CONFIDENCE_THRESHOLD))
    best_by_field: dict[str, FieldPrediction] = {}
    # 같은 필드 후보가 여러 개 나오면 신뢰도가 가장 높은 라인만 최종 선택한다.
    for prediction in classifier.predict(lines):
        if prediction.confidence < confidence_threshold:
            continue
        current = best_by_field.get(prediction.field_name)
        if current is None or prediction.confidence > current.confidence:
            best_by_field[prediction.field_name] = prediction

    return {field_name: prediction.text for field_name, prediction in best_by_field.items()}


@lru_cache(maxsize=1)
def get_business_card_field_classifier() -> BertBusinessCardFieldClassifier | None:
    # 모델 로딩 비용이 크므로 프로세스당 한 번만 초기화한다.
    artifact_dir = _default_artifact_dir()
    metadata_path = artifact_dir / "field_classifier_metadata.json"
    if not metadata_path.is_file():
        return None

    try:
        metadata = _read_metadata(metadata_path)
        model_type = metadata.get("model_type")
        # 산출물 일부가 없으면 예외를 던지지 않고 분류기 미사용 상태로 내려간다.
        if model_type == BERT_MODEL_TYPE and not (artifact_dir / "field_classifier.pt").is_file():
            return None
        if model_type == BERT_LORA_MODEL_TYPE and (
            not _adapter_path(artifact_dir, metadata).is_dir() or not _head_path(artifact_dir, metadata).is_file()
        ):
            return None
        if model_type not in {BERT_MODEL_TYPE, BERT_LORA_MODEL_TYPE}:
            return None
        return BertBusinessCardFieldClassifier(
            artifact_dir=artifact_dir,
            metadata_path=metadata_path,
        )
    except Exception as exc:
        logger.warning("business_card_field_classifier.load_failed artifact_dir=%s error=%s", artifact_dir, exc)
        return None


def _default_artifact_dir() -> Path:
    # 운영 환경에서는 환경변수로 모델 산출물 위치를 바꿀 수 있다.
    configured_path = os.getenv("AI_BUSINESS_CARD_MODEL_DIR")
    if configured_path:
        return Path(configured_path)
    ai_root = Path(__file__).resolve().parents[2]
    return ai_root / "local_ocr_lab" / "pytorch_outputs"


def _default_hf_cache_dir() -> Path:
    # Hugging Face 모델 캐시는 로컬 학습/운영 환경에 맞게 분리 가능하다.
    configured_path = os.getenv("AI_HF_CACHE_DIR")
    if configured_path:
        return Path(configured_path)
    ai_root = Path(__file__).resolve().parents[2]
    return ai_root / "local_ocr_lab" / "hf_cache"


def _read_metadata(metadata_path: Path) -> dict[str, object]:
    with metadata_path.open(encoding="utf-8-sig") as file:
        payload = json.load(file)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected metadata object: {metadata_path}")
    return payload


def _string_int_dict(value: object) -> dict[str, int]:
    if not isinstance(value, dict):
        raise ValueError("Expected dictionary metadata")
    return {str(key): int(item) for key, item in value.items()}


def _read_idx_to_label(metadata: dict[str, object]) -> dict[int, str]:
    idx_to_label = metadata.get("idx_to_label")
    if isinstance(idx_to_label, dict):
        return {int(index): str(label) for index, label in idx_to_label.items()}
    label_to_idx = _string_int_dict(metadata["label_to_idx"])
    return {index: label for label, index in label_to_idx.items()}


def _adapter_path(artifact_dir: Path, metadata: dict[str, object]) -> Path:
    adapter_dir = str(metadata.get("adapter_dir", DEFAULT_LORA_ADAPTER_DIR))
    return artifact_dir / adapter_dir


def _head_path(artifact_dir: Path, metadata: dict[str, object]) -> Path:
    head_path = str(metadata.get("classifier_head", DEFAULT_LORA_HEAD_PATH))
    return artifact_dir / head_path


class BertAttentionPooling(nn.Module):
    def __init__(self, hidden_size: int) -> None:
        super().__init__()
        self.attention = nn.Linear(hidden_size, 1)

    def forward(self, hidden_states: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        # padding 토큰은 attention 대상에서 제외하고 실제 토큰 표현만 가중 평균한다.
        scores = self.attention(hidden_states).squeeze(-1)
        scores = scores.masked_fill(attention_mask == 0, -1e9)
        weights = torch.softmax(scores, dim=1)
        return (hidden_states * weights.unsqueeze(-1)).sum(dim=1)


class BertLineFieldClassifier(nn.Module):
    def __init__(
        self,
        *,
        model_name: str,
        num_labels: int,
        cache_dir: Path,
        adapter_path: Path | None = None,
    ) -> None:
        super().__init__()
        self.bert = BertModel.from_pretrained(model_name, cache_dir=str(cache_dir))
        hidden_size = self.bert.config.hidden_size
        if adapter_path is not None:
            from peft import PeftModel

            # LoRA adapter가 있으면 base BERT 위에 adapter weight를 얹어 사용한다.
            self.bert = PeftModel.from_pretrained(self.bert, str(adapter_path))
        self.pool = BertAttentionPooling(hidden_size)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size + BERT_FEATURE_SIZE, 128),
            nn.ReLU(),
            nn.Linear(128, num_labels),
        )

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        features: torch.Tensor,
    ) -> torch.Tensor:
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = self.pool(outputs.last_hidden_state, attention_mask)
        return self.classifier(torch.cat([pooled, features], dim=1))

    def load_head_state_dict(self, state_dict: dict[str, object]) -> None:
        self.pool.load_state_dict(state_dict["pool"])
        self.classifier.load_state_dict(state_dict["classifier"])


def extract_bert_features(text: str, position: float, total_lines: float) -> torch.Tensor:
    # 짧은 명함 라인 분류에 도움이 되는 위치와 문자 패턴 feature를 만든다.
    length = len(text)
    digit_ratio = sum(char.isdigit() for char in text) / max(length, 1)
    upper_ratio = sum(char.isupper() for char in text) / max(length, 1)
    has_at = int("@" in text)
    return torch.tensor(
        [
            position,
            total_lines,
            digit_ratio,
            upper_ratio,
            has_at,
            length / 50.0,
        ],
        dtype=torch.float32,
    )
