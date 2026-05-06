from dataclasses import dataclass, field
from typing import Literal


ChatTask = Literal[
    "semantic_search",
    "timeline_lookup",
    "maintenance_lookup",
    "summarize_period",
    "needs_clarification",
]
ChatTarget = Literal[
    "general",
    "document",
    "activity",
    "maintenance",
    "contract",
    "project",
    "opportunity",
    "user",
    "customer",
]
AnswerStyle = Literal["direct_answer", "timeline", "bullet_summary", "ranked_list"]


@dataclass(frozen=True)
class ChatQueryPlan:
    task: ChatTask = "semantic_search"
    target: ChatTarget = "general"
    source_types: list[str] = field(default_factory=list)
    filters: dict[str, list[str]] = field(default_factory=dict)
    time_label: str | None = None
    time_from: str | None = None
    time_to: str | None = None
    rewritten_query: str | None = None
    answer_style: AnswerStyle = "direct_answer"
    missing_fields: list[str] = field(default_factory=list)
    clarification_message: str | None = None
    confidence: float = 0.0
