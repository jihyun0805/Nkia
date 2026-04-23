from typing import Any


SENSITIVE_KEY_PARTS = {
    "password",
    "passwd",
    "secret",
    "token",
    "key",
    "credential",
}


def build_document_text(*, title: str | None, content: str | None, payload: dict[str, Any]) -> str:
    if content and content.strip():
        parts = []
        if title and title.strip():
            parts.append(f"제목: {title.strip()}")
        parts.append(content.strip())
        return "\n".join(parts)

    lines = []
    if title and title.strip():
        lines.append(f"제목: {title.strip()}")
    lines.extend(flatten_payload(payload))
    return "\n".join(lines).strip()


def flatten_payload(payload: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for key in sorted(payload.keys()):
        lines.extend(flatten_value(key, payload[key]))
    return lines


def flatten_value(path: str, value: Any) -> list[str]:
    if value is None or is_sensitive_path(path):
        return []
    if isinstance(value, dict):
        lines: list[str] = []
        for key in sorted(value.keys()):
            next_path = f"{path}.{key}" if path else str(key)
            lines.extend(flatten_value(next_path, value[key]))
        return lines
    if isinstance(value, list):
        lines: list[str] = []
        for index, item in enumerate(value):
            next_path = f"{path}[{index}]"
            lines.extend(flatten_value(next_path, item))
        return lines

    text = str(value).strip()
    if not text:
        return []
    return [f"{path}: {text}"]


def is_sensitive_path(path: str) -> bool:
    normalized = path.lower()
    return any(part in normalized for part in SENSITIVE_KEY_PARTS)
