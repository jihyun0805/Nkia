from __future__ import annotations

import json
import logging
import re
from http.client import IncompleteRead
from time import sleep
from typing import TYPE_CHECKING, Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings
from app.models.user_context import UserContext
from app.schemas.answer import AnswerEvidence
from app.schemas.report import ManagementReportResponse, ReportType

if TYPE_CHECKING:
    from app.embeddings.model import EmbeddingModel


logger = logging.getLogger(__name__)


DEFAULT_MANAGEMENT_REPORT_SOURCE_TYPES = [
    "PROJECT_OPPORTUNITY",
    "SALES_ACTIVITY",
    "QUOTATION",
    "RFP",
    "RFP_ANALYSIS",
    "PRB",
    "PRB_RESULT",
    "BID_RESULT",
    "WON",
    "LOST",
    "ORDER_REPORT",
    "CONTRACT",
    "PROJECT",
    "PROJECT_RESULT_REPORT",
    "POST_SALES",
    "MAINTENANCE",
    "MAINTENANCE_QUOTE",
    "CUSTOMER_SUPPORT",
    "LICENSE",
    "BILLING",
    "ATTACHMENT",
]

DEFAULT_SECTIONS_BY_TYPE: dict[ReportType, list[str]] = {
    "management": ["요약", "핵심 현황", "주요 이슈", "리스크", "대응 방안", "근거"],
    "sales": ["요약", "영업 파이프라인", "수주/실주 요인", "주요 고객", "대응 방안", "근거"],
    "risk": ["요약", "주요 리스크", "영향도", "완화 방안", "모니터링 포인트", "근거"],
    "project": ["요약", "프로젝트 현황", "일정/범위 이슈", "리스크", "다음 조치", "근거"],
    "maintenance": ["요약", "유지보수 현황", "고객 지원 이슈", "계약/라이선스 포인트", "대응 방안", "근거"],
    "custom": ["요약", "분석", "리스크", "대응 방안", "근거"],
}


def create_management_report(
    *,
    query: str,
    title: str | None,
    report_type: ReportType,
    limit: int,
    source_types: list[str] | None,
    attachment_session_id: str | None,
    start_at: str | None,
    end_at: str | None,
    customer_group: str | None,
    business_types: list[str],
    statuses: list[str],
    sections: list[str],
    audience: str,
    analytics_context: dict[str, Any] | None,
    embedder: EmbeddingModel,
    user_context: UserContext | None = None,
) -> ManagementReportResponse:
    from app.services.chat_planner_service import plan_chat_query
    from app.services.query_normalization_service import normalize_query_context
    from app.services.search_service import search_knowledge

    effective_title = title or infer_report_title(query=query, report_type=report_type)
    effective_sections = sections or DEFAULT_SECTIONS_BY_TYPE[report_type]
    effective_source_types = source_types or DEFAULT_MANAGEMENT_REPORT_SOURCE_TYPES
    report_query = build_report_search_query(
        query=query,
        report_type=report_type,
        sections=effective_sections,
        customer_group=customer_group,
        business_types=business_types,
        statuses=statuses,
    )
    normalization = normalize_query_context(report_query)
    chat_plan, normalization = plan_chat_query(report_query, normalization)
    search_response = search_knowledge(
        query=report_query,
        limit=limit,
        source_types=effective_source_types,
        attachment_session_id=attachment_session_id,
        # Management-report analytics are filtered precisely by the backend.
        # The AI index currently stores ingestion event time and sparse metadata,
        # so applying those filters here can hide valid evidence entirely.
        start_at=None,
        end_at=None,
        metadata_filters={},
        embedder=embedder,
        chat_plan=chat_plan,
        normalization=normalization,
        user_context=user_context,
    )
    evidences = build_answer_evidences(search_response.results)

    if not search_response.results:
        return ManagementReportResponse(
            query=query,
            title=effective_title,
            reportType=report_type,
            reportStatus="insufficient_evidence",
            report="경영 리포트를 생성할 근거가 부족합니다. 기간, 고객 구분, 사업 유형, 진행단계 조건을 조정해 주세요.",
            embeddingModel=search_response.embeddingModel,
            chatModel="evidence-guard",
            retrievalConfidence=search_response.retrievalConfidence,
            confidenceBand=search_response.confidenceBand,
            confidenceReasons=search_response.confidenceReasons,
            sourceTypes=effective_source_types,
            evidences=[],
        )

    if settings.gms_key:
        try:
            report = create_management_report_answer(
                query=build_report_generation_query(
                    query=query,
                    title=effective_title,
                    report_type=report_type,
                    audience=audience,
                    sections=effective_sections,
                    filters={
                        "startAt": start_at,
                        "endAt": end_at,
                        "customerGroup": customer_group,
                        "businessTypes": business_types,
                        "statuses": statuses,
                    },
                    analytics_context=analytics_context or {},
                ),
                context=build_evidence_context(search_response.results),
            )
            return ManagementReportResponse(
                query=query,
                title=effective_title,
                reportType=report_type,
                reportStatus="good_report",
                report=report,
                embeddingModel=search_response.embeddingModel,
                chatModel=settings.gms_chat_model,
                retrievalConfidence=search_response.retrievalConfidence,
                confidenceBand=search_response.confidenceBand,
                confidenceReasons=search_response.confidenceReasons,
                sourceTypes=effective_source_types,
                evidences=evidences,
            )
        except RuntimeError as exc:
            logger.error("Management report LLM generation failed: %s", exc, exc_info=True)
            return build_fallback_report_response(
                query=query,
                title=effective_title,
                report_type=report_type,
                search_response=search_response,
                source_types=effective_source_types,
                evidences=evidences,
                degraded_reason="management_report_generation_failed",
            )

    return build_fallback_report_response(
        query=query,
        title=effective_title,
        report_type=report_type,
        search_response=search_response,
        source_types=effective_source_types,
        evidences=evidences,
        degraded_reason="llm_unavailable",
    )


def build_report_search_query(
    *,
    query: str,
    report_type: ReportType,
    sections: list[str],
    customer_group: str | None = None,
    business_types: list[str] | None = None,
    statuses: list[str] | None = None,
) -> str:
    filter_lines = []
    if customer_group:
        filter_lines.append(f"고객 구분: {customer_group}")
    if business_types:
        filter_lines.append(f"사업 유형: {', '.join(business_types)}")
    if statuses:
        filter_lines.append(f"진행단계: {', '.join(statuses)}")
    filter_text = "\n".join(filter_lines) if filter_lines else "필터 없음"
    return "\n".join(
        [
            query,
            f"리포트 유형: {report_type}",
            f"필수 섹션: {', '.join(sections)}",
            filter_text,
            "경영 리포트 작성에 필요한 현황, 지표, 이슈, 리스크, 대응 방안, 근거를 찾아라.",
        ]
    )


def build_report_metadata_filters(
    *,
    customer_group: str | None,
    business_types: list[str],
    statuses: list[str],
) -> dict[str, object]:
    filters: dict[str, object] = {}
    if customer_group and customer_group.upper() != "ALL":
        filters["customerGroup"] = customer_group
    effective_business_types = [value for value in business_types if value.upper() != "ALL"]
    if effective_business_types:
        filters["businessTypes"] = effective_business_types
    effective_statuses = [value for value in statuses if value.upper() != "ALL"]
    if effective_statuses:
        filters["statuses"] = effective_statuses
    return filters


def build_management_report_system_prompt() -> str:
    return """
당신은 영업/사업기회 포트폴리오를 경영진에게 보고하는 한국어 보고서 작성 AI입니다.

규칙:
- 반드시 한국어로 작성한다.
- 답변은 반드시 `## 요약`으로 시작한다.
- 본문 문장은 보고서 문체의 `~다` 체로 통일한다.
- `합니다`, `됩니다`, `해주세요`, `입니다`, `습니다`, `요`로 끝나는 문장을 쓰지 않는다.
- `결론:`, `왜냐하면:`, `참고 문서:`, `다음에 볼 것:` 형식은 사용하지 않는다.
- 공통 질의응답 템플릿이 아니라 경영 리포트 문서 형식으로 작성한다.
- 집계 데이터의 총건수, 금액, 단계별 분포, 사업유형별 분포, 상위 사업기회는 최우선 근거로 사용한다.
- 단계별 금액은 `Stage portfolio summary` 표가 있을 때만 그 값을 사용한다.
- `Top opportunities by expected budget`는 상위 사업기회 목록일 뿐이므로, 이 표를 단계별 금액처럼 임의 합산하지 않는다.
- `(합산: 표 상위 항목 금액으로 파악)`, `(추정)`, `(상위 항목 기준)`처럼 근거 불명확성을 본문에 표시하는 문구를 쓰지 않는다.
- 집계 데이터에 없는 진행단계나 사업유형은 표에 행을 만들지 않는다.
- 해당 행은 있는데 일부 집계값만 없을 때만 해당 칸을 `-`로 두고, 추정 계산으로 채우지 않는다.
- 근거 문서는 리스크, 이슈, 대응 방안의 보조 근거로만 사용한다.
- 근거가 없는 고객명, 금액, 날짜, 확률, 의사결정 사항은 추정하지 않는다.
- 마크다운 제목, 표, bullet을 사용해 구조화한다.
- 금액은 가능하면 억 원 단위로 읽기 쉽게 병기한다.
- 경영진이 바로 판단할 수 있도록 현황, 리스크, 대응 액션을 명확히 구분한다.
- 진행단계 용어는 FINDING=발굴, ACTIVITY=활동, BID=입찰, CONTRACT=계약, PROJECT=사업, MAINTENANCE=유지보수로 통일한다.
- 리포트 본문 표와 문장에는 가능하면 영문 단계 코드 대신 한글 단계명을 사용한다.
- 리포트 본문에는 `백엔드`, `백엔드 집계 컨텍스트`, `집계 컨텍스트` 같은 내부 구현 표현을 쓰지 않는다.
""".strip()


def create_management_report_answer(*, query: str, context: str) -> str:
    payload = {
        "model": settings.gms_chat_model,
        "reasoning_effort": "low",
        "max_completion_tokens": 4000,
        "messages": [
            {
                "role": "developer",
                "content": build_management_report_system_prompt(),
            },
            {
                "role": "user",
                "content": "\n\n".join(
                    [
                        f"리포트 생성 요청:\n{query}",
                        f"근거 문서:\n{context}",
                    ]
                ),
            },
        ],
    }
    data = request_management_report_completion(payload=payload)
    return extract_management_report_content(data)


def request_management_report_completion(*, payload: dict[str, Any]) -> dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.gms_key}",
    }
    retryable_http_codes = {408, 425, 429, 500, 502, 503, 504}
    last_error: RuntimeError | None = None
    timeout_seconds = max(settings.gms_timeout_seconds, 120)

    for attempt in range(1, 4):
        request = Request(
            settings.gms_chat_completions_url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urlopen(request, timeout=timeout_seconds) as response:
                status_code = response.status
                try:
                    response_body = response.read().decode("utf-8", errors="replace")
                except IncompleteRead as exc:
                    response_body = exc.partial.decode("utf-8", errors="replace")
        except TimeoutError as exc:
            if attempt < 3:
                sleep(0.75 * attempt)
                continue
            raise RuntimeError(f"GMS management report request timed out: {exc}") from exc
        except HTTPError as exc:
            status_code = exc.code
            response_body = exc.read().decode("utf-8", errors="replace")
        except URLError as exc:
            if attempt < 3:
                sleep(0.5 * attempt)
                continue
            last_error = RuntimeError(f"GMS management report network error: {exc.reason}")
            break

        if status_code in retryable_http_codes and attempt < 3:
            sleep(0.35 * attempt)
            continue
        if status_code >= 400:
            last_error = RuntimeError(
                f"GMS management report failed: HTTP {status_code} {response_body[:300]}"
            )
            break

        if not response_body.strip():
            if attempt < 3:
                sleep(0.35 * attempt)
                continue
            last_error = RuntimeError("GMS management report failed: empty response body")
            break

        try:
            return json.loads(response_body)
        except json.JSONDecodeError:
            recovered_content = recover_management_report_content(response_body)
            if recovered_content is not None:
                return {"choices": [{"message": {"content": recovered_content}}]}
            raw_content = recover_raw_management_report(response_body)
            if raw_content is not None:
                return {"choices": [{"message": {"content": raw_content}}]}
            if attempt < 3:
                sleep(0.35 * attempt)
                continue
            last_error = RuntimeError(f"GMS management report returned non-JSON response: {response_body[:500]}")
            break

    if last_error is not None:
        raise last_error
    raise RuntimeError("GMS management report failed: unknown error")


def extract_management_report_content(data: dict[str, Any]) -> str:
    try:
        return str(data["choices"][0]["message"]["content"]).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected GMS management report response: {data}") from exc


def recover_management_report_content(response_body: str) -> str | None:
    matches = re.findall(r'"content"\s*:\s*("(?:(?:\\.)|[^"\\])*")', response_body, flags=re.DOTALL)
    recovered_values: list[str] = []
    for quoted_value in matches:
        try:
            recovered_values.append(json.loads(quoted_value))
        except json.JSONDecodeError:
            continue

    if not recovered_values:
        return None
    return max(recovered_values, key=len).strip()


def recover_raw_management_report(response_body: str) -> str | None:
    stripped = response_body.strip()
    if not stripped:
        return None
    if stripped.startswith("<"):
        return None
    report_markers = [
        "## 요약",
        "## 1. 사업기회 포트폴리오 현황",
        "## 대표 근거",
        "## 종합 의견",
    ]
    if any(marker in stripped for marker in report_markers):
        return stripped
    return None


def build_report_generation_query(
    *,
    query: str,
    title: str,
    report_type: ReportType,
    audience: str,
    sections: list[str],
    filters: dict[str, object],
    analytics_context: dict[str, Any],
) -> str:
    filter_lines = [f"- {key}: {value}" for key, value in filters.items() if value not in (None, "", [], {})]
    section_lines = [f"- {section}" for section in sections]
    analytics_lines = build_analytics_context_lines(analytics_context)
    return "\n".join(
        [
            f"리포트 제목: {title}",
            f"리포트 유형: {report_type}",
            f"대상 독자: {audience}",
            "",
            "사용자 요청:",
            query,
            "",
            "필터:",
            "\n".join(filter_lines) if filter_lines else "- 없음",
            "",
            "필수 섹션:",
            "\n".join(section_lines),
            "",
            "집계 데이터:",
            "\n".join(analytics_lines) if analytics_lines else "- 없음",
            "",
            "작성 규칙:",
            "- 리포트는 반드시 한국어로 작성한다.",
            "- 건수, 금액, 진행단계 분포, 사업유형 분포, 사업기회 목록은 집계 데이터를 최우선 근거로 사용한다.",
            "- 근거 문서는 리스크, 이슈, 정성적 대응 방안을 설명하는 보조 근거로만 사용한다.",
            "- 집계 데이터에 지표, 차트, 테이블이 있으면 전체 사업기회 데이터가 부족하다고 쓰지 않는다.",
            "- 집계 데이터나 근거 문서에 없는 수치, 날짜, 원인, 전망은 추정하지 않는다.",
            "- 집계 데이터에 없는 진행단계나 사업유형은 표에 행을 만들지 않는다.",
            "- 예를 들어 Stage portfolio summary에 MAINTENANCE 행이 없으면, 사업기회 포트폴리오 현황 표에도 유지보수 행을 쓰지 않는다.",
            "- 특정 리스크나 원인을 근거 문서로 확인하기 어렵다면, 확인 가능한 범위와 추가 확인 필요 사항을 구분해서 쓴다.",
            "- 경영진이 바로 판단할 수 있도록 결론, 리스크, 대응 방안을 명확히 쓴다.",
            "- 마크다운 형식으로 작성한다.",
            "- 아래 '출력 형식'의 제목과 순서를 그대로 사용한다.",
            "- '왜냐하면' 같은 구어체 연결 문장을 쓰지 않는다.",
            "- 요약과 종합 의견은 보고서 문체의 짧은 문단으로 작성한다.",
            "- 본문 문장은 모두 `~다` 체로 통일한다.",
            "- `합니다`, `됩니다`, `해주세요`, `입니다`, `습니다`, `요`로 끝나는 문장을 쓰지 않는다.",
            "- 현황, 리스크, 액션은 마크다운 표를 우선 사용한다.",
            "- 표는 반드시 헤더 행과 구분 행(|---|---|)을 포함한 표준 마크다운 테이블로 작성한다.",
            "- 금액은 원 단위 숫자를 그대로 나열하지 말고 억 원 단위로 읽기 쉽게 병기한다.",
            "- 비중은 집계 데이터의 수치로 계산 가능한 경우에만 사용한다.",
            "- 특정 고객명이나 사업기회명은 집계 데이터의 테이블 또는 근거 문서에 있는 경우에만 언급한다.",
            "- 진행단계 용어는 FINDING=발굴, ACTIVITY=활동, BID=입찰, CONTRACT=계약, PROJECT=사업, MAINTENANCE=유지보수로 변환해 쓴다.",
            "- 리포트 본문 표와 문장에는 영문 단계 코드 대신 한글 단계명을 우선 사용한다.",
            "- 리포트 본문에는 '백엔드', '백엔드 집계 컨텍스트', '집계 컨텍스트' 같은 내부 구현 표현을 쓰지 않는다.",
            "- 마지막에는 사용한 대표 출처를 요약하는 대표 근거 섹션을 둔다.",
            "- 대표 근거 섹션은 전체 검색 문서 목록이 아니라 본문 작성에 직접 사용한 주요 문서와 집계 데이터만 요약한다.",
            "",
            "출력 형식:",
            "## 요약",
            "선택 조건 기준 전체 사업기회 규모, 예상 사업비, 현재 포트폴리오의 핵심 특징을 3~5문장으로 요약한다.",
            "입찰 단계 집중, 특정 사업유형 편중, 핵심 리스크, 향후 관리 방향을 경영진 보고서 문체로 작성한다.",
            "",
            "## 1. 사업기회 포트폴리오 현황",
            "| 구분 | 건수 | 예상 사업비 | 비중/해석 |",
            "|---|---:|---:|---|",
            "| 전체 사업기회 | n건 | n억 원 | 전체 규모 |",
            "| 입찰 | n건 | n억 원 | 단기 수주 활동 집중 여부 |",
            "| 사업 | n건 | n억 원 | 사업화 진행 의미 |",
            "위 표의 단계 행은 예시이며, Stage portfolio summary에 실제로 존재하는 단계만 작성한다.",
            "",
            "### 주요 해석",
            "- 단계별 집중도와 분기 실적 영향 가능성을 쓴다.",
            "- 사업 또는 유지보수 전환이 제한적인 경우 전환 관리 필요성을 쓴다.",
            "",
            "## 2. 사업유형별 포트폴리오 분석",
            "| 사업유형 | 예상 사업비 | 비중 | 주요 해석 |",
            "|---|---:|---:|---|",
            "| ETC | n억 원 | n% | 기타 분류 집중 여부 |",
            "| ITSM | n억 원 | n% | 전략/확장 가능성 |",
            "",
            "### 시사점",
            "- 사업유형 편중 여부와 포트폴리오 다변화 필요성을 쓴다.",
            "- ETC는 UI 입력체계상 EMS/AIOTION/ITO/ITSM 외 기타 분류가 포함될 수 있음을 필요 시 설명한다.",
            "",
            "## 3. 핵심 사업기회 및 리스크 분석",
            "| 사업기회 | 고객 | 사업유형 | 단계 | 예상 사업비 | 주요 이슈 | 핵심 리스크 | 권장 대응 |",
            "|---|---|---|---|---:|---|---|---|",
            "| 사업명 | 고객명 | 유형 | 단계 | n억 원 | 확인된 이슈 | 리스크 | 대응 |",
            "",
            "### 상세 분석",
            "근거 문서로 확인되는 핵심 사업기회의 이슈와 리스크를 1~2개 문단으로 설명한다.",
            "근거가 부족한 사업기회는 추정하지 말고, 확인 가능한 범위로만 쓴다.",
            "",
            "## 4. 주요 리스크 현황",
            "| 리스크 | 영향도 | 발생 가능성 | 사업 영향 | 대응 방안 |",
            "|---|---|---|---|---|",
            "| 데이터 이관 품질 | High/Medium/Low | High/Medium/Low | 일정/비용 영향 | 사전 검증 등 |",
            "",
            "근거 문서로 확인되는 리스크를 우선 작성하고, 포트폴리오 편중처럼 집계 데이터로 확인 가능한 리스크를 함께 정리한다.",
            "",
            "## 5. 경영 관점 주요 판단사항",
            "### 긍정 요인",
            "- 파이프라인 규모, 단기 입찰 대상, 레퍼런스 확대 가능성 등 긍정 요인을 쓴다.",
            "",
            "### 우려 요인",
            "- 사업유형 편중, 단계 편중, 기술/일정 리스크 등 우려 요인을 쓴다.",
            "",
            "## 6. 권고 액션",
            "| 우선순위 | 액션 | 목적 | 담당/확인 포인트 |",
            "|---|---|---|---|",
            "| High | 입찰 우선순위 재정렬 | 단기 수주율 극대화 | 영업/기술 대응 현황 |",
            "",
            "## 종합 의견",
            "현재 포트폴리오 상태와 단기 관리 포인트를 2~4문장으로 정리한다.",
            "경영진이 바로 판단할 수 있도록 집중 대응 대상과 중장기 개선 방향을 함께 제시한다.",
            "",
            "## 대표 근거",
            "- 집계 데이터: 총건수, 예상 사업비, 단계별/사업유형별 분포, 상위 사업기회 테이블",
            "- 대표 근거 문서: 본문 작성에 직접 사용한 주요 문서 유형과 문서명을 요약한다.",
        ]
    )


def build_analytics_context_lines(analytics_context: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    metrics = analytics_context.get("metrics") or []
    if metrics:
        lines.append("지표:")
        for metric in metrics:
            if not isinstance(metric, dict):
                continue
            label = metric.get("label")
            value = metric.get("value")
            unit = metric.get("unit")
            if label not in (None, ""):
                suffix = f" {unit}" if unit else ""
                lines.append(f"- {label}: {value}{suffix}")

    charts = analytics_context.get("charts") or []
    if charts:
        lines.append("차트:")
        for chart in charts:
            if not isinstance(chart, dict):
                continue
            title = chart.get("title")
            points = chart.get("data") or []
            rendered_points = []
            for point in points:
                if isinstance(point, dict):
                    rendered_points.append(f"{display_report_value(point.get('label'))}: {point.get('value')}")
            if title and rendered_points:
                lines.append(f"- {title}: {', '.join(rendered_points)}")

    tables = analytics_context.get("tables") or []
    if tables:
        lines.append("테이블:")
        for table in tables:
            if not isinstance(table, dict):
                continue
            title = table.get("title")
            columns = table.get("columns") or []
            rows = table.get("rows") or []
            if title:
                lines.append(f"- {title}")
            if columns:
                lines.append(f"  컬럼: {', '.join(str(column) for column in columns)}")
            for row in rows[:10]:
                if isinstance(row, list):
                    lines.append(f"  행: {', '.join(display_report_value(value) for value in row)}")
    return lines


def display_report_value(value: Any) -> str:
    if isinstance(value, str):
        return STAGE_LABELS.get(value, value)
    return str(value)


STAGE_LABELS = {
    "FINDING": "발굴",
    "ACTIVITY": "활동",
    "BID": "입찰",
    "CONTRACT": "계약",
    "PROJECT": "사업",
    "MAINTENANCE": "유지보수",
    "POST_SALES": "사후영업",
}


def infer_report_title(*, query: str, report_type: ReportType) -> str:
    labels = {
        "management": "경영 리포트",
        "sales": "영업 리포트",
        "risk": "리스크 리포트",
        "project": "프로젝트 리포트",
        "maintenance": "유지보수 리포트",
        "custom": "분석 리포트",
    }
    compact_query = " ".join(query.split())
    if len(compact_query) > 36:
        compact_query = f"{compact_query[:36].rstrip()}..."
    return f"{compact_query} - {labels[report_type]}"


def build_fallback_report_response(
    *,
    query: str,
    title: str,
    report_type: ReportType,
    search_response: Any,
    source_types: list[str],
    evidences: list[AnswerEvidence],
    degraded_reason: str,
) -> ManagementReportResponse:
    return ManagementReportResponse(
        query=query,
        title=title,
        reportType=report_type,
        reportStatus="upstream_degraded",
        report=build_extractive_report(title=title, evidences=evidences),
        embeddingModel=search_response.embeddingModel,
        chatModel="extractive-report-fallback",
        retrievalConfidence=search_response.retrievalConfidence,
        confidenceBand=search_response.confidenceBand,
        confidenceReasons=search_response.confidenceReasons,
        sourceTypes=source_types,
        evidences=evidences,
        degradedReason=degraded_reason,
    )


def build_extractive_report(*, title: str, evidences: list[AnswerEvidence]) -> str:
    lines = [
        f"# {title}",
        "",
        "## 요약",
        "LLM 리포트 생성이 불가하여 검색된 근거를 요약한 대체 리포트입니다.",
        "",
        "## 검색된 근거 요약",
    ]
    for index, evidence in enumerate(evidences[:8], start=1):
        heading = evidence.title or f"{evidence.sourceType} {evidence.sourceId}"
        content = " ".join(evidence.content.split())
        if len(content) > 320:
            content = f"{content[:320].rstrip()}..."
        lines.append(f"{index}. {heading}: {content}")
    lines.extend(["", "## 대응 방안", "대상, 기간, 지표 조건을 조정한 뒤 상세 리포트를 다시 생성하세요."])
    return "\n".join(lines)


def build_answer_evidences(results: list[object]) -> list[AnswerEvidence]:
    return [
        AnswerEvidence(
            evidenceType=getattr(result, "evidenceType", "retrieved_evidence"),
            sourceType=result.sourceType,
            sourceId=result.sourceId,
            title=result.title,
            chunkIndex=result.chunkIndex,
            distance=result.distance,
            vectorScore=result.vectorScore,
            keywordScore=result.keywordScore,
            finalScore=result.finalScore,
            matchedBy=result.matchedBy,
            content=result.content,
            metadata=result.metadata,
        )
        for result in results
    ]


def build_evidence_context(results: list[object]) -> str:
    sections = []
    for index, result in enumerate(results, start=1):
        header = f"[근거 {index}] {result.sourceType} - {result.sourceId}"
        if result.title:
            header += f" - {result.title}"
        metadata_lines = build_metadata_context_lines(result.metadata)
        sections.append("\n".join([header, *metadata_lines, "content:", result.content]))
    return "\n\n---\n\n".join(sections)


def build_metadata_context_lines(metadata: dict | None) -> list[str]:
    if not metadata:
        return []
    keys = [
        "rootOpportunityCode",
        "rootOpportunityName",
        "rootBusinessType",
        "rootOpportunityStatus",
        "customerName",
        "rootCustomerName",
        "businessType",
        "expectedAmount",
        "contractAmount",
        "documentStage",
        "documentWrittenAt",
        "businessStartAt",
        "businessEndAt",
    ]
    return [f"metadata.{key}: {metadata[key]}" for key in keys if metadata.get(key) not in (None, "", [], {})]
