from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import torch
from torch import nn
from transformers import BertModel, BertTokenizer


MODEL_CONFIDENCE_THRESHOLD = 0.40
BERT_MODEL_TYPE = "bert_multilingual_line_classifier"
BERT_FEATURE_SIZE = 6


@dataclass(frozen=True)
class FieldPrediction:
    field_name: str
    text: str
    confidence: float


class BertBusinessCardFieldClassifier:
    def __init__(
        self,
        *,
        checkpoint_path: Path,
        metadata_path: Path,
    ) -> None:
        metadata = _read_metadata(metadata_path)
        self.model_name = str(metadata.get("model_name", "bert-base-multilingual-cased"))
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
        ).to(self.device)
        state_dict = torch.load(checkpoint_path, map_location=self.device)
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
    checkpoint_path = artifact_dir / "field_classifier.pt"
    metadata_path = artifact_dir / "field_classifier_metadata.json"
    if not checkpoint_path.is_file() or not metadata_path.is_file():
        return None

    try:
        metadata = _read_metadata(metadata_path)
        if metadata.get("model_type") != BERT_MODEL_TYPE:
            return None
        return BertBusinessCardFieldClassifier(
            checkpoint_path=checkpoint_path,
            metadata_path=metadata_path,
        )
    except Exception:
        return None


def _default_artifact_dir() -> Path:
    ai_root = Path(__file__).resolve().parents[2]
    return ai_root / "local_ocr_lab" / "pytorch_outputs"


def _default_hf_cache_dir() -> Path:
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
    ) -> None:
        super().__init__()
        self.bert = BertModel.from_pretrained(model_name, cache_dir=str(cache_dir))
        self.pool = BertAttentionPooling(self.bert.config.hidden_size)
        self.classifier = nn.Sequential(
            nn.Linear(self.bert.config.hidden_size + BERT_FEATURE_SIZE, 128),
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
