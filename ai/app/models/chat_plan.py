# 인수인계 메모: 챗봇 내부 모델 계층입니다. 의도, 검색 계획, 정규화 결과, 사용자 컨텍스트 같은 중간 상태를 정의합니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
