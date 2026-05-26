# 인수인계: 명함 OCR 텍스트 라인을 이름/회사/직책/전화/이메일 같은 필드로 분류하는 규칙/모델 보조 서비스입니다.
# 핵심 흐름: OCR 원문은 business_card_ocr.py에서 들어오고, 이 파일은 필드 후보를 정규화해 응답 스키마로 넘깁니다.
# 같이 확인: 명함 샘플이 추가되면 local_ocr_lab 테스트와 분류 규칙을 같이 보정하세요.
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
        if self.model_type == BERT_LORA_MODEL_TYPE:
            head_state = torch.load(_head_path(artifact_dir, metadata), map_location=self.device)
            self.model.load_head_state_dict(head_state)
        else:
            state_dict = torch.load(artifact_dir / "field_classifier.pt", map_location=self.device)
            self.model.load_state_dict(state_dict)
        self.model.eval()

    def predict(self, lines: list[str]) -> list[FieldPrediction]:
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
    classifier = get_business_card_field_classifier()
    if classifier is None:
        return {}

    confidence_threshold = float(getattr(classifier, "confidence_threshold", MODEL_CONFIDENCE_THRESHOLD))
    best_by_field: dict[str, FieldPrediction] = {}
    for prediction in classifier.predict(lines):
        if prediction.confidence < confidence_threshold:
            continue
        current = best_by_field.get(prediction.field_name)
        if current is None or prediction.confidence > current.confidence:
            best_by_field[prediction.field_name] = prediction

    return {field_name: prediction.text for field_name, prediction in best_by_field.items()}


@lru_cache(maxsize=1)
def get_business_card_field_classifier() -> BertBusinessCardFieldClassifier | None:
    artifact_dir = _default_artifact_dir()
    metadata_path = artifact_dir / "field_classifier_metadata.json"
    if not metadata_path.is_file():
        return None

    try:
        metadata = _read_metadata(metadata_path)
        model_type = metadata.get("model_type")
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
    configured_path = os.getenv("AI_BUSINESS_CARD_MODEL_DIR")
    if configured_path:
        return Path(configured_path)
    ai_root = Path(__file__).resolve().parents[2]
    return ai_root / "local_ocr_lab" / "pytorch_outputs"


def _default_hf_cache_dir() -> Path:
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
