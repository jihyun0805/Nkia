from dataclasses import dataclass, field

from app.langgraph.state import GraphState


@dataclass(frozen=True)
class FocusPlan:
    focus: str = "UNKNOWN"
    time_scope: str = "UNKNOWN"
    answer_shape: str | None = None
    reasons: list[str] = field(default_factory=list)


RISK_KEYWORDS = ("리스크", "위험", "이슈", "문제", "장애", "애로")
STATUS_KEYWORDS = ("상태", "현황", "현재", "단계")
REASON_KEYWORDS = ("사유", "이유", "왜", "원인", "배경")
WORKFLOW_KEYWORDS = ("결재", "승인", "반려", "접수", "심의", "활동요청", "활동 요청", "workflow")
METRIC_KEYWORDS = ("매출", "이익", "수익성", "수익률", "이익률", "금액", "비용", "건수", "횟수")
TIMELINE_KEYWORDS = ("언제", "이력", "타임라인", "순서", "흐름", "과정")
SUMMARY_KEYWORDS = ("요약", "정리", "종합", "한번에", "전반")

EXECUTION_PROGRESS_KEYWORDS = (
    "진행하며",
    "진행하면서",
    "진행 중",
    "진행중",
    "과정",
    "수행 중",
    "수행중",
    "운영 중",
    "운영중",
    "구축 중",
    "구축중",
    "이행 기간",
    "병행운영",
)
RECENT_KEYWORDS = ("최근", "요즘")
CURRENT_KEYWORDS = ("지금", "현재")
HISTORICAL_KEYWORDS = ("당시", "과거", "예전", "이전")


def build_focus_plan(*, query: str, graph_state: GraphState) -> FocusPlan:
    normalized_query = " ".join(query.lower().split())
    reasons: list[str] = []

    focus = "UNKNOWN"
    if any(keyword in normalized_query for keyword in RISK_KEYWORDS):
        focus = "RISK"
        reasons.append("focus:risk_keyword")
    elif any(keyword in normalized_query for keyword in REASON_KEYWORDS):
        focus = "REASON"
        reasons.append("focus:reason_keyword")
    elif any(keyword in normalized_query for keyword in WORKFLOW_KEYWORDS):
        focus = "WORKFLOW"
        reasons.append("focus:workflow_keyword")
    elif any(keyword in normalized_query for keyword in STATUS_KEYWORDS):
        focus = "STATUS"
        reasons.append("focus:status_keyword")
    elif any(keyword in normalized_query for keyword in TIMELINE_KEYWORDS):
        focus = "TIMELINE"
        reasons.append("focus:timeline_keyword")
    elif any(keyword in normalized_query for keyword in SUMMARY_KEYWORDS):
        focus = "SUMMARY"
        reasons.append("focus:summary_keyword")
    elif any(keyword in normalized_query for keyword in METRIC_KEYWORDS) or graph_state.aggregation.metric:
        focus = "METRIC"
        reasons.append("focus:metric_keyword")

    time_scope = "UNKNOWN"
    if any(keyword in normalized_query for keyword in EXECUTION_PROGRESS_KEYWORDS):
        time_scope = "EXECUTION_PROGRESS"
        reasons.append("time_scope:execution_progress")
    elif any(keyword in normalized_query for keyword in RECENT_KEYWORDS):
        time_scope = "RECENT"
        reasons.append("time_scope:recent")
    elif any(keyword in normalized_query for keyword in CURRENT_KEYWORDS):
        time_scope = "CURRENT"
        reasons.append("time_scope:current")
    elif any(keyword in normalized_query for keyword in HISTORICAL_KEYWORDS):
        time_scope = "HISTORICAL"
        reasons.append("time_scope:historical")

    answer_shape = None
    if focus == "RISK":
        answer_shape = "risk_focused"
        reasons.append("answer_shape:risk_focused")
    elif focus == "REASON":
        answer_shape = "reason_focused"
        reasons.append("answer_shape:reason_focused")
    elif focus == "WORKFLOW":
        answer_shape = "workflow_focused"
        reasons.append("answer_shape:workflow_focused")
    elif focus == "STATUS":
        answer_shape = "snapshot_focused"
        reasons.append("answer_shape:snapshot_focused")
    elif focus == "METRIC":
        answer_shape = "metric_focused"
        reasons.append("answer_shape:metric_focused")

    if focus == "RISK" and time_scope == "UNKNOWN" and graph_state.phaseScope in {
        "PROJECT_ACTIVE",
        "PROJECT_REPORTED",
        "WARRANTY_MAINTENANCE",
        "PAID_MAINTENANCE",
    }:
        time_scope = "EXECUTION_PROGRESS"
        reasons.append("time_scope:phase_inferred_execution")

    return FocusPlan(
        focus=focus,
        time_scope=time_scope,
        answer_shape=answer_shape,
        reasons=reasons,
    )
