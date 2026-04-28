# BERT 모델
from __future__ import annotations

import argparse
import json
import random
import re
from dataclasses import dataclass
from pathlib import Path

import torch
from rapidfuzz import fuzz
from torch import nn
from torch.utils.data import DataLoader, Dataset
from transformers import BertModel, BertTokenizer

from ocr_lab_common import AI_ROOT, write_json


FIELD_NAMES = (
    "company_name",
    "contact_name",
    "position",
    "address",
    "email",
    "mobile_phone",
    "office_phone",
    "fax_phone",
    "responsibility",
    "department_name",
    "none",
)
MODEL_TYPE = "bert_multilingual_line_classifier"
MODEL_NAME = "bert-base-multilingual-cased"
MAX_LENGTH = 64
FEATURE_SIZE = 6
DEFAULT_CONFIDENCE_THRESHOLD = 0.4
PHONE_REGEX = re.compile(r"\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}")


@dataclass(frozen=True)
class LineExample:
    card_id: str
    line_index: int
    total_lines: int
    text: str
    label: str


def normalize(text: str | None) -> str:
    if not text:
        return ""
    return "".join(text.lower().split())


def digits_only(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\D", "", text)


def fuzzy_match(left: str, right: str) -> bool:
    return bool(left and right and fuzz.ratio(left, right) > 85)


def match_line_to_field(line: str, label_payload: dict[str, object | None]) -> str:
    line_normalized = normalize(line)

    if "@" in line and "." in line:
        return "email"

    if PHONE_REGEX.search(line):
        line_digits = digits_only(line)
        for field in ("mobile_phone", "office_phone", "fax_phone"):
            value = label_payload.get(field)
            if isinstance(value, str) and digits_only(value) and digits_only(value) in line_digits:
                return field

    for field in FIELD_NAMES[:-1]:
        value = label_payload.get(field)
        if isinstance(value, str) and fuzzy_match(line_normalized, normalize(value)):
            return field

    return "none"


def extract_features(text: str, position: float, total_lines: float) -> torch.Tensor:
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


class LineDataset(Dataset[dict[str, torch.Tensor]]):
    def __init__(
        self,
        examples: list[LineExample],
        *,
        label_to_idx: dict[str, int],
        tokenizer: BertTokenizer,
    ) -> None:
        self.examples = examples
        self.label_to_idx = label_to_idx
        self.tokenizer = tokenizer

    def __len__(self) -> int:
        return len(self.examples)

    def __getitem__(self, index: int) -> dict[str, torch.Tensor]:
        example = self.examples[index]
        encoded = self.tokenizer(
            example.text,
            padding="max_length",
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt",
        )
        features = extract_features(
            example.text,
            example.line_index / max(example.total_lines - 1, 1),
            min(example.total_lines, 32) / 32,
        )
        return {
            "input_ids": encoded["input_ids"].squeeze(0),
            "attention_mask": encoded["attention_mask"].squeeze(0),
            "features": features,
            "label": torch.tensor(self.label_to_idx[example.label], dtype=torch.long),
        }


class AttentionPooling(nn.Module):
    def __init__(self, hidden_size: int) -> None:
        super().__init__()
        self.attention = nn.Linear(hidden_size, 1)

    def forward(self, hidden_states: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        scores = self.attention(hidden_states).squeeze(-1)
        scores = scores.masked_fill(attention_mask == 0, -1e9)
        weights = torch.softmax(scores, dim=1)
        return (hidden_states * weights.unsqueeze(-1)).sum(dim=1)


class BertLineFieldClassifier(nn.Module):
    def __init__(self, *, num_labels: int, model_name: str = MODEL_NAME, cache_dir: Path | None = None) -> None:
        super().__init__()
        cache_dir_value = str(cache_dir) if cache_dir is not None else None
        self.bert = BertModel.from_pretrained(model_name, cache_dir=cache_dir_value)
        self.pool = AttentionPooling(self.bert.config.hidden_size)
        self.classifier = nn.Sequential(
            nn.Linear(self.bert.config.hidden_size + FEATURE_SIZE, 128),
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


def load_json(path: Path) -> dict[str, object | None]:
    with path.open(encoding="utf-8-sig") as file:
        payload = json.load(file)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return payload


def split_raw_text(raw_text: object | None) -> list[str]:
    if not isinstance(raw_text, str):
        return []
    return [line.strip() for line in raw_text.splitlines() if line.strip()]


def split_ocr_lines(output_payload: dict[str, object | None]) -> list[str]:
    lines_payload = output_payload.get("lines")
    if isinstance(lines_payload, list):
        lines: list[str] = []
        for item in lines_payload:
            text = item.get("text") if isinstance(item, dict) else item
            if str(text).strip():
                lines.append(str(text).strip())
        if lines:
            return lines
    return split_raw_text(output_payload.get("raw_text"))


def find_image_path(images_dir: Path, stem: str) -> Path | None:
    for suffix in (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"):
        candidate = images_dir / f"{stem}{suffix}"
        if candidate.exists():
            return candidate
    return None


def build_examples(labels_dir: Path, images_dir: Path, outputs_dir: Path) -> list[LineExample]:
    examples: list[LineExample] = []

    for label_path in sorted(labels_dir.glob("card*.json")):
        card_id = label_path.stem
        output_path = outputs_dir / f"{card_id}.json"
        if not output_path.exists():
            continue
        if find_image_path(images_dir, card_id) is None and not card_id.startswith("card_synth_"):
            continue

        label_payload = load_json(label_path)
        output_payload = load_json(output_path)
        lines = split_ocr_lines(output_payload)
        total_lines = len(lines)
        for line_index, line in enumerate(lines):
            examples.append(
                LineExample(
                    card_id=card_id,
                    line_index=line_index,
                    total_lines=total_lines,
                    text=line,
                    label=match_line_to_field(line, label_payload),
                )
            )

    return examples


def split_examples_by_card(
    examples: list[LineExample],
    *,
    val_ratio: float = 0.2,
    seed: int = 42,
) -> tuple[list[LineExample], list[LineExample]]:
    card_ids = sorted({example.card_id for example in examples})
    rng = random.Random(seed)
    rng.shuffle(card_ids)
    val_size = max(1, round(len(card_ids) * val_ratio)) if len(card_ids) > 1 else 0
    val_card_ids = set(card_ids[:val_size])
    return (
        [example for example in examples if example.card_id not in val_card_ids],
        [example for example in examples if example.card_id in val_card_ids],
    )


def compute_class_weights(labels: list[int], num_classes: int, device: torch.device) -> torch.Tensor:
    counts = torch.zeros(num_classes, dtype=torch.float32)
    for label in labels:
        counts[label] += 1
    weights = 1.0 / (counts + 1e-6)
    return (weights / weights.sum()).to(device)


def train_epoch(
    model: BertLineFieldClassifier,
    loader: DataLoader[dict[str, torch.Tensor]],
    *,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> float:
    model.train()
    total_loss = 0.0

    for batch in loader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        features = batch["features"].to(device)
        labels = batch["label"].to(device)

        logits = model(input_ids, attention_mask, features)
        loss = criterion(logits, labels)

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        total_loss += loss.item()

    return total_loss / max(len(loader), 1)


def evaluate(
    model: BertLineFieldClassifier,
    loader: DataLoader[dict[str, torch.Tensor]],
    *,
    device: torch.device,
) -> float:
    model.eval()
    correct = 0
    total = 0

    with torch.inference_mode():
        for batch in loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            features = batch["features"].to(device)
            labels = batch["label"].to(device)

            predictions = model(input_ids, attention_mask, features).argmax(dim=1)
            correct += (predictions == labels).sum().item()
            total += labels.size(0)

    return correct / total if total else 0.0


def save_artifacts(
    *,
    model: BertLineFieldClassifier,
    label_to_idx: dict[str, int],
    artifacts_dir: Path,
    history: list[dict[str, float | int]],
    confidence_threshold: float,
) -> None:
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), artifacts_dir / "field_classifier.pt")
    write_json(
        artifacts_dir / "field_classifier_metadata.json",
        {
            "model_type": MODEL_TYPE,
            "model_name": MODEL_NAME,
            "label_to_idx": label_to_idx,
            "idx_to_label": {str(index): label for label, index in label_to_idx.items()},
            "field_names": FIELD_NAMES,
            "feature_size": FEATURE_SIZE,
            "max_length": MAX_LENGTH,
            "confidence_threshold": confidence_threshold,
            "history": history,
        },
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the BERT business-card line field classifier.")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--confidence-threshold", type=float, default=DEFAULT_CONFIDENCE_THRESHOLD)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    labels_dir = AI_ROOT / "local_ocr_lab" / "labels"
    images_dir = AI_ROOT / "local_ocr_lab" / "business_card"
    outputs_dir = AI_ROOT / "local_ocr_lab" / "paddleoutputs"
    artifacts_dir = AI_ROOT / "local_ocr_lab" / "pytorch_outputs"
    cache_dir = AI_ROOT / "local_ocr_lab" / "hf_cache"

    examples = build_examples(labels_dir, images_dir, outputs_dir)
    if not examples:
        print("No training examples were built. Generate OCR outputs first.")
        return 1

    train_examples, val_examples = split_examples_by_card(
        examples,
        val_ratio=args.val_ratio,
        seed=args.seed,
    )
    if not train_examples:
        print("Not enough examples for a train split.")
        return 1

    label_to_idx = {label: index for index, label in enumerate(FIELD_NAMES)}
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = BertTokenizer.from_pretrained(MODEL_NAME, cache_dir=str(cache_dir))

    train_loader = DataLoader(
        LineDataset(train_examples, label_to_idx=label_to_idx, tokenizer=tokenizer),
        batch_size=args.batch_size,
        shuffle=True,
    )
    val_loader = DataLoader(
        LineDataset(val_examples, label_to_idx=label_to_idx, tokenizer=tokenizer),
        batch_size=args.batch_size,
        shuffle=False,
    )

    model = BertLineFieldClassifier(
        num_labels=len(FIELD_NAMES),
        cache_dir=cache_dir,
    ).to(device)
    weights = compute_class_weights([label_to_idx[example.label] for example in train_examples], len(FIELD_NAMES), device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)

    history: list[dict[str, float | int]] = []
    for epoch in range(1, args.epochs + 1):
        loss = train_epoch(model, train_loader, optimizer=optimizer, criterion=criterion, device=device)
        val_accuracy = evaluate(model, val_loader, device=device) if val_examples else 0.0
        history.append({"epoch": epoch, "loss": round(loss, 4), "val_accuracy": round(val_accuracy, 4)})
        print(f"epoch={epoch:02d} loss={loss:.4f} val_acc={val_accuracy:.4f}")

    save_artifacts(
        model=model,
        label_to_idx=label_to_idx,
        artifacts_dir=artifacts_dir,
        history=history,
        confidence_threshold=args.confidence_threshold,
    )
    print(f"Saved BERT artifacts to {artifacts_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
