from datetime import datetime, timedelta, timezone
from decimal import Decimal
import logging
import re
from typing import Any

import psycopg

from app.adapters.nkia_domain_adapter import (
    adapt_contract_snapshot,
    adapt_maintenance_snapshot,
    adapt_opportunity_snapshot,
    adapt_project_snapshot,
    adapt_workflow_snapshot,
)
from app.core.config import settings
from app.embeddings.model import EmbeddingModel
from app.models.intent import StructuredQueryIntent
from app.models.normalization import QueryNormalization
from app.repositories.backend_query_repository import (
    fetch_bid_result_snapshot,
    fetch_contract_snapshot,
    fetch_opportunity_delivery_snapshot,
    fetch_quotation_snapshot,
    fetch_metric_rows_for_opportunity_codes,
    fetch_maintenance_activity_rank,
    fetch_maintenance_activity_rank_filtered,
    fetch_maintenance_history,
    fetch_maintenance_quote_highlights,
    fetch_maintenance_quote_snapshot,
    fetch_maintenance_snapshot,
    fetch_maintenance_snapshot_by_opportunity,
    fetch_maintenance_status_rows,
    fetch_sales_activity_timeline,
    fetch_difficult_win_candidates,
    fetch_opportunity_evidence_inventory,
    fetch_opportunity_snapshot,
    fetch_paid_maintenance_transition_rows,
    fetch_prb_snapshot,
    fetch_project_progress_rows,
    fetch_project_result_highlight,
    fetch_project_snapshot,
    fetch_recent_document_rows,
    fetch_opportunity_resolution_candidates,
    fetch_session_attachment_rows,
    fetch_ranked_metric_rows,
    fetch_rfp_snapshot,
    fetch_status_rows,
    fetch_total_metric_summary,
    fetch_workflow_snapshot,
    fetch_won_summary,
    resolve_primary_opportunity,
    fetch_product_catalog_rows,
    fetch_module_quotation_revenue_rows,
    fetch_entity_count,
    fetch_opportunity_list_rows,
)
from app.schemas.answer import AnswerEvidence, AnswerResponse
from app.services.metric_registry import get_metric_spec
from app.services.search_service import search_knowledge
from app.services.structured_executors import answer_entity_risk_focus_query

logger = logging.getLogger(__name__)
BUSINESS_CODE_PATTERN = re.compile(r"(?<![A-Z0-9-])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){2,}(?![A-Z0-9-])")
KST = timezone(timedelta(hours=9))


def answer_targeted_domain_query(
    *,
    query: str,
    normalization: QueryNormalization,
    graph_state: Any | None,
    limit: int,
    start_at: str | None,
    end_at: str | None,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    normalized_query = normalization.normalized_query
    exact_codes = extract_business_codes(query)

    exact_snapshot_response = answer_exact_code_snapshot_query(
        query=query,
        exact_codes=exact_codes,
        limit=limit,
        embedder=embedder,
    )
    if exact_snapshot_response is not None:
        return exact_snapshot_response

    attachment_related_response = answer_attachment_related_opportunity_query(
        query=query,
        normalization=normalization,
        attachment_session_id=getattr(normalization, "attachment_session_id", None),
        limit=limit,
        embedder=embedder,
    )
    if attachment_related_response is not None:
        return attachment_related_response

    if is_maintenance_activity_rank_query(normalized_query):
        rows = fetch_maintenance_activity_rank(limit=max(limit, 3))
        if not rows:
            return None
        return build_maintenance_activity_rank_response(query=query, rows=rows[:3], limit=limit, embedder=embedder)

    if is_entity_count_query(normalized_query):
        entity_type = extract_count_entity_type(normalized_query)
        if entity_type:
            count = fetch_entity_count(entity_type)
            if count is not None:
                return build_entity_count_response(
                    query=query, entity_type=entity_type, count=count, embedder=embedder
                )

    if is_opportunity_list_query(normalized_query):
        rows = fetch_status_rows(status_filters=[], limit=50)
        if rows:
            return build_opportunity_list_response(
                query=query, rows=rows, limit=limit, embedder=embedder
            )

    if is_module_revenue_query(normalized_query):
        product_class = extract_product_class_from_query(normalized_query)
        revenue_rows = fetch_module_quotation_revenue_rows(product_class=product_class, limit=20)
        if revenue_rows:
            return build_module_revenue_response(
                query=query,
                rows=revenue_rows,
                product_class=product_class,
                limit=limit,
                embedder=embedder,
            )

    if is_product_catalog_query(normalized_query):
        name_term = extract_product_name_from_query(normalized_query)
        product_class = None if name_term else extract_product_class_from_query(normalized_query)
        catalog_rows = fetch_product_catalog_rows(
            product_class=product_class, name_term=name_term, limit=200
        )
        if catalog_rows:
            return build_product_catalog_response(
                query=query,
                rows=catalog_rows,
                product_class=product_class,
                name_term=name_term,
                limit=limit,
                embedder=embedder,
            )

    entity = resolve_primary_opportunity_with_fallback(
        query=query,
        normalization=normalization,
        exact_codes=exact_codes,
    )
    if entity is None:
        if is_high_risk_query(normalized_query):
            rows = rank_difficult_wins(
                fetch_difficult_win_candidates(
                    status_filters=["발굴", "제안", "경쟁중", "실주", "수주"],
                    filters={},
                    limit=max(limit, 5),
                ),
                "high_risk",
            )
            if rows:
                return build_high_risk_response(query=query, rows=rows[:3], limit=limit, embedder=embedder)

        if is_project_result_highlight_query(normalized_query):
            rows = fetch_project_result_highlight(limit=1)
            if rows:
                return build_project_result_highlight_response(
                    query=query,
                    row=rows[0],
                    limit=limit,
                    embedder=embedder,
                )

        if is_generic_maintenance_quote_query(normalized_query):
            rows = fetch_maintenance_quote_highlights(limit=3)
            if rows:
                return build_generic_maintenance_quote_response(
                    query=query,
                    rows=rows,
                    limit=limit,
                    embedder=embedder,
                )

        if is_warranty_maintenance_list_query(normalized_query):
            rows = fetch_maintenance_status_rows(contract_type="무상", status=None, limit=max(limit, 5))
            if rows:
                return build_maintenance_list_response(
                    query=query,
                    rows=rows,
                    title="무상유지보수 중인 사업",
                    intro="핵심 결론: 현재 무상유지보수로 관리 중인 사업은 다음과 같습니다.",
                    limit=limit,
                    embedder=embedder,
                )

        if is_paid_maintenance_transition_query(normalized_query):
            rows = fetch_paid_maintenance_transition_rows(limit=max(limit, 5))
            if rows:
                return build_paid_maintenance_transition_response(
                    query=query,
                    rows=rows,
                    limit=limit,
                    embedder=embedder,
                )
        return None

    opportunity_code = str(entity["opportunity_code"])
    opportunity_name = str(entity["opportunity_name"])

    if is_entity_risk_focus_query(normalized_query, graph_state):
        risk_response = answer_entity_risk_focus_query(
            query=query,
            opportunity_code=opportunity_code,
            opportunity_name=opportunity_name,
            start_at=start_at or normalization.time_range.start_at,
            end_at=end_at or normalization.time_range.end_at,
            limit=limit,
            embedder=embedder,
        )
        if risk_response is not None:
            return risk_response

    if is_opportunity_identity_query(normalized_query):
        snapshot = fetch_opportunity_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_opportunity_identity_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_customer_decision_query(normalized_query):
        snapshot = fetch_opportunity_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_customer_decision_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_workflow_status_query(normalized_query):
        snapshot = fetch_workflow_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_workflow_snapshot_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_bid_loss_reason_query(normalized_query):
        snapshot = fetch_bid_result_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_bid_loss_reason_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_evidence_inventory_query(normalized_query):
        rows = fetch_opportunity_evidence_inventory(opportunity_code=opportunity_code)
        if rows:
            return build_evidence_inventory_response(
                query=query,
                opportunity_code=opportunity_code,
                opportunity_name=opportunity_name,
                rows=rows,
                limit=limit,
                embedder=embedder,
            )

    if is_contract_maintenance_query(normalized_query):
        snapshot = fetch_opportunity_delivery_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_contract_maintenance_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_project_maintenance_summary_query(normalized_query):
        snapshot = fetch_opportunity_delivery_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_project_maintenance_summary_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_support_issue_query(normalized_query, normalization):
        rows = fetch_maintenance_history(
            opportunity_code=opportunity_code,
            start_at=start_at or normalization.time_range.start_at,
            end_at=end_at or normalization.time_range.end_at,
            limit=max(limit * 2, 8),
        )
        if rows:
            return build_support_issue_response(
                query=query,
                opportunity_code=opportunity_code,
                opportunity_name=opportunity_name,
                rows=rows,
                limit=limit,
                embedder=embedder,
            )
        snapshot = fetch_opportunity_delivery_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_support_issue_snapshot_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_maintenance_quote_query(normalized_query):
        snapshot = fetch_maintenance_quote_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_maintenance_quote_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_sales_activity_timeline_query(normalized_query, normalization):
        rows = fetch_sales_activity_timeline(opportunity_code=opportunity_code, limit=max(limit * 2, 6))
        if rows:
            return build_sales_activity_timeline_response(
                query=query,
                opportunity_code=opportunity_code,
                opportunity_name=opportunity_name,
                rows=rows,
                limit=limit,
                embedder=embedder,
            )

    if is_maintenance_history_query(normalized_query, normalization):
        rows = fetch_maintenance_history(
            opportunity_code=opportunity_code,
            start_at=start_at or normalization.time_range.start_at,
            end_at=end_at or normalization.time_range.end_at,
            limit=max(limit * 2, 8),
        )
        if rows:
            return build_maintenance_history_response(
                query=query,
                opportunity_code=opportunity_code,
                opportunity_name=opportunity_name,
                rows=rows,
                limit=limit,
                embedder=embedder,
            )

    if is_maintenance_status_query(normalized_query, normalization):
        snapshot = fetch_maintenance_snapshot_by_opportunity(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_maintenance_snapshot_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_prb_query(normalized_query):
        snapshot = fetch_prb_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_prb_snapshot_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_rfp_query(normalized_query):
        snapshot = fetch_rfp_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_rfp_snapshot_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    if is_status_query(normalized_query):
        snapshot = fetch_opportunity_snapshot(opportunity_code=opportunity_code)
        if snapshot is not None:
            return build_opportunity_status_response(
                query=query,
                snapshot=snapshot,
                limit=limit,
                embedder=embedder,
            )

    return None


def answer_exact_code_snapshot_query(
    *,
    query: str,
    exact_codes: list[str],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    if not exact_codes:
        return None

    for code in exact_codes:
        if code.startswith("QUO-") or code.startswith("Q-"):
            snapshot = fetch_quotation_snapshot(quotation_code=code)
            if snapshot is not None:
                return build_quotation_snapshot_response(query=query, snapshot=snapshot, limit=limit, embedder=embedder)
        if code.startswith("CTR-") or code.startswith("CT-"):
            snapshot = fetch_contract_snapshot(contract_code=code)
            if snapshot is not None:
                return build_contract_snapshot_response(query=query, snapshot=snapshot, limit=limit, embedder=embedder)
        if code.startswith("PRJ-"):
            snapshot = fetch_project_snapshot(project_code=code)
            if snapshot is not None:
                return build_project_snapshot_response(query=query, snapshot=snapshot, limit=limit, embedder=embedder)
        if code.startswith("MNT-") or code.startswith("MC-"):
            snapshot = fetch_maintenance_snapshot(maintenance_code=code)
            if snapshot is not None:
                return build_maintenance_snapshot_response(query=query, snapshot=snapshot, limit=limit, embedder=embedder)
        snapshot = fetch_contract_snapshot(contract_code=code)
        if snapshot is not None:
            return build_contract_snapshot_response(query=query, snapshot=snapshot, limit=limit, embedder=embedder)
        snapshot = fetch_project_snapshot(project_code=code)
        if snapshot is not None:
            return build_project_snapshot_response(query=query, snapshot=snapshot, limit=limit, embedder=embedder)
        snapshot = fetch_maintenance_snapshot(maintenance_code=code)
        if snapshot is not None:
            return build_maintenance_snapshot_response(query=query, snapshot=snapshot, limit=limit, embedder=embedder)
    return None


def answer_structured_query(
    *,
    query: str,
    intent: StructuredQueryIntent,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    if intent.intent_type == "clarification":
        return AnswerResponse(
            query=query,
            answer=intent.clarification_message or (
                "질문을 처리하기 위한 기준 정보가 부족합니다. "
                "비교 기준이나 정렬 기준을 함께 알려주세요."
            ),
            embeddingModel=embedder.config.model_name,
            chatModel="query-planner",
            excludedSourceTypes=[],
            evidences=[],
        )

    if intent.intent_type == "difficult_win_list" and intent.difficulty_reason:
        try:
            rows = rank_difficult_wins(
                fetch_difficult_win_candidates(
                    status_filters=intent.status_filters or ["수주"],
                    filters=intent.filters,
                    limit=10,
                ),
                intent.difficulty_reason,
            )
        except psycopg.Error as exc:
            logger.warning("Structured difficult-win query failed: %s", exc)
            return build_structured_data_unavailable_response(query=query, embedder=embedder)
        if not rows:
            return build_empty_structured_response(query=query, embedder=embedder)
        return build_difficult_win_response(query=query, intent=intent, rows=rows[:3], limit=limit, embedder=embedder)

    if intent.intent_type == "metric_rank" and intent.metric_key and intent.metric_label:
        if intent.metric_key == "risk_exposure_index":
            try:
                rows = rank_difficult_wins(
                    fetch_difficult_win_candidates(
                        status_filters=intent.status_filters or ["발굴", "제안", "경쟁중", "실주", "수주"],
                        filters=intent.filters,
                        limit=max(intent.rank_position + intent.result_count, 5),
                    ),
                    "high_risk",
                )
            except psycopg.Error as exc:
                logger.warning("Structured risk-rank query failed: %s", exc)
                return build_structured_data_unavailable_response(query=query, embedder=embedder)
            if not rows:
                return build_empty_structured_response(query=query, embedder=embedder)
            for row in rows:
                row["metric_value"] = row.get("difficulty_score") or row.get("risk_score") or 0.0
            return build_metric_rank_response(query=query, intent=intent, rows=rows, limit=limit, embedder=embedder)
        try:
            fetch_limit = max(intent.rank_position + intent.result_count, 3)
            rows = fetch_ranked_metric_rows(
                metric_key=intent.metric_key,
                sort_direction=intent.sort_direction,
                status_filters=intent.status_filters,
                filters=intent.filters,
                limit=fetch_limit,
            )
        except psycopg.Error as exc:
            logger.warning("Structured metric-rank query failed: %s", exc)
            return build_structured_data_unavailable_response(query=query, embedder=embedder)
        if not rows:
            return build_empty_structured_response(query=query, embedder=embedder)
        return build_metric_rank_response(query=query, intent=intent, rows=rows, limit=limit, embedder=embedder)

    if intent.intent_type == "status_list":
        try:
            rows = fetch_status_rows(status_filters=intent.status_filters, filters=intent.filters, limit=5)
        except psycopg.Error as exc:
            logger.warning("Structured status query failed: %s", exc)
            return build_structured_data_unavailable_response(query=query, embedder=embedder)
        if not rows:
            return build_empty_structured_response(query=query, embedder=embedder)
        return build_status_list_response(query=query, intent=intent, rows=rows, limit=limit, embedder=embedder)

    if intent.intent_type == "count_rank" and intent.count_domain == "maintenance_activity":
        try:
            rows = fetch_maintenance_activity_rank_filtered(
                contract_type=intent.contract_type,
                limit=max(limit, 3),
            )
        except psycopg.Error as exc:
            logger.warning("Structured maintenance count-rank query failed: %s", exc)
            return build_structured_data_unavailable_response(query=query, embedder=embedder)
        if not rows:
            return build_empty_structured_response(query=query, embedder=embedder)
        return build_maintenance_activity_rank_response(
            query=query,
            rows=rows[:3],
            limit=limit,
            embedder=embedder,
            contract_type=intent.contract_type,
        )

    if intent.intent_type == "period_summary" and intent.summary_domain == "won":
        try:
            summary = fetch_won_summary(
                start_at=intent.time_from,
                end_at=intent.time_to,
                limit=max(limit, 3),
            )
        except psycopg.Error as exc:
            logger.warning("Structured won-summary query failed: %s", exc)
            return build_structured_data_unavailable_response(query=query, embedder=embedder)
        if int(summary["won_count"]) == 0:
            return build_empty_structured_response(query=query, embedder=embedder)
        return build_won_summary_response(query=query, intent=intent, summary=summary, limit=limit, embedder=embedder)

    if intent.intent_type == "aggregate_total" and intent.metric_key and intent.metric_label:
        try:
            summary = fetch_total_metric_summary(
                metric_key=intent.metric_key,
                status_filters=intent.status_filters,
                filters=intent.filters,
            )
        except psycopg.Error as exc:
            logger.warning("Structured aggregate-total query failed: %s", exc)
            return build_structured_data_unavailable_response(query=query, embedder=embedder)
        if int(summary["row_count"]) == 0:
            return build_empty_structured_response(query=query, embedder=embedder)
        return build_total_metric_response(query=query, intent=intent, summary=summary, limit=limit, embedder=embedder)

    if intent.intent_type == "document_recency_rank" and intent.document_scope:
        try:
            rows = fetch_recent_document_rows(
                document_scope=intent.document_scope,
                recency_basis=intent.recency_basis or "document_date",
                limit=max(intent.rank_position + intent.result_count, 5),
            )
        except psycopg.Error as exc:
            logger.warning("Structured document-recency query failed: %s", exc)
            return build_structured_data_unavailable_response(query=query, embedder=embedder)
        if not rows:
            return build_empty_structured_response(query=query, embedder=embedder)
        return build_document_recency_response(query=query, intent=intent, rows=rows, limit=limit, embedder=embedder)

    return None


def answer_graph_structured_extension(
    *,
    query: str,
    graph_state: Any,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    comparison_pairs = list(getattr(graph_state, "comparisonPairs", []) or [])
    comparison_metric = getattr(graph_state, "comparisonMetric", None)
    delta_windows = list(getattr(graph_state, "deltaWindows", []) or [])
    intent = getattr(graph_state, "intent", None)

    if len(comparison_pairs) == 2 and comparison_metric:
        response = answer_pair_metric_comparison(
            query=query,
            comparison_pairs=comparison_pairs,
            metric_key=comparison_metric,
            limit=limit,
            embedder=embedder,
        )
        if response is not None:
            return response

    if delta_windows and intent == "period_summary" and comparison_metric == "won":
        response = answer_period_delta_summary(
            query=query,
            delta_windows=delta_windows,
            limit=limit,
            embedder=embedder,
        )
        if response is not None:
            return response

    attachment_session_id = getattr(graph_state, "attachmentSessionId", None)
    if attachment_session_id and is_attachment_related_opportunity_query(query):
        response = answer_attachment_related_opportunity_query(
            query=query,
            normalization=None,
            attachment_session_id=attachment_session_id,
            limit=limit,
            embedder=embedder,
        )
        if response is not None:
            return response

    normalized_q = " ".join(query.lower().split())

    if is_entity_count_query(normalized_q):
        entity_type = extract_count_entity_type(normalized_q)
        if entity_type:
            count = fetch_entity_count(entity_type)
            if count is not None:
                return build_entity_count_response(
                    query=query, entity_type=entity_type, count=count, embedder=embedder
                )

    if is_opportunity_list_query(normalized_q):
        rows = fetch_opportunity_list_rows(limit=50)
        if rows:
            return build_opportunity_list_response(
                query=query, rows=rows, limit=limit, embedder=embedder
            )

    if is_module_revenue_query(normalized_q):
        product_class = extract_product_class_from_query(normalized_q)
        revenue_rows = fetch_module_quotation_revenue_rows(product_class=product_class, limit=20)
        if revenue_rows:
            return build_module_revenue_response(
                query=query,
                rows=revenue_rows,
                product_class=product_class,
                limit=limit,
                embedder=embedder,
            )

    if is_product_catalog_query(normalized_q):
        name_term = extract_product_name_from_query(normalized_q)
        product_class = None if name_term else extract_product_class_from_query(normalized_q)
        catalog_rows = fetch_product_catalog_rows(
            product_class=product_class, name_term=name_term, limit=200
        )
        if catalog_rows:
            return build_product_catalog_response(
                query=query,
                rows=catalog_rows,
                product_class=product_class,
                name_term=name_term,
                limit=limit,
                embedder=embedder,
            )

    return None


ATTACHMENT_RELATED_BUSINESS_KEYWORDS = (
    "관련된 사업",
    "관련 사업",
    "관련된 사업기회",
    "관련 사업기회",
    "관련된 건",
    "관련 건",
    "어떤 사업",
    "어느 사업",
)
ATTACHMENT_STOPWORDS = {
    "붙임",
    "입찰공고",
    "입찰",
    "공고",
    "제안요청서",
    "요청서",
    "제안서",
    "문서",
    "파일",
    "사업",
    "구축",
    "개발",
    "시스템",
    "관련",
    "대해",
    "알려줘",
    "첨부한",
    "업로드한",
    "rpf",
    "rfp",
}
ATTACHMENT_BUSINESS_SPLIT_PATTERN = re.compile(
    r"(통합모니터링|모니터링|통합관제|관제|ems|itsm|aiops|ito|cloudops|dashboard|시스템|플랫폼|구축|개발|고도화|전환|사업)",
    re.IGNORECASE,
)


def is_attachment_related_opportunity_query(query: str) -> bool:
    normalized_query = " ".join(query.lower().split())
    if "첨부" not in normalized_query and "업로드" not in normalized_query:
        return False
    return any(keyword in normalized_query for keyword in ATTACHMENT_RELATED_BUSINESS_KEYWORDS)


def answer_attachment_related_opportunity_query(
    *,
    query: str,
    normalization: QueryNormalization | None,
    attachment_session_id: str | None,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    if not attachment_session_id:
        return None

    attachment_rows = fetch_session_attachment_rows(session_id=attachment_session_id, limit=3)
    if not attachment_rows:
        return None

    profile = build_attachment_anchor_profile(attachment_rows)
    candidates = fetch_opportunity_resolution_candidates(limit=600)
    strong_scored = rank_attachment_related_opportunities(profile=profile, candidates=candidates, minimum_score=18)
    if strong_scored and profile.get("customer_terms"):
        top_reasons = [str(reason) for reason in strong_scored[0].get("attachment_match_reasons", [])]
        has_customer_match = any(reason.startswith("customer_") for reason in top_reasons)
        if not has_customer_match:
            strong_scored = []
    if not strong_scored:
        weak_scored = rank_attachment_related_opportunities(profile=profile, candidates=candidates, minimum_score=8)
        if weak_scored:
            top_rows = weak_scored[: max(limit, 3)]
            answer_lines = [
                "핵심 결론: 첨부한 RFP 문서와 정확히 매핑된 내부 사업기회는 확인되지 않았습니다.",
                "",
                (
                    f"대신 첨부 문서에서 {format_anchor_summary(profile)}가 확인되어, "
                    "주제상 가장 유사한 내부 사업기회 후보를 안내합니다."
                ),
                "",
                "유사 내부 후보:",
                *[
                    (
                        f"- {row['opportunity_name']} ({row['customer_name']}, "
                        f"{row.get('current_status') or '상태미기재'}, {row.get('business_type') or '유형미기재'})"
                    )
                    for row in top_rows[: min(3, len(top_rows))]
                ],
            ]
            evidences = build_attachment_anchor_evidences(
                attachment_rows=attachment_rows,
                opportunity_rows=top_rows,
                profile=profile,
                limit=max(limit, 3),
            )
            return AnswerResponse(
                query=query,
                answer="\n".join(answer_lines),
                embeddingModel=embedder.config.model_name,
                chatModel="attachment-anchor-engine",
                route="mixed",
                answerStatus="insufficient_evidence",
                excludedSourceTypes=[],
                evidences=evidences[: max(limit, 3)],
            )
        return AnswerResponse(
            query=query,
            answer=(
                "첨부한 문서를 기준으로 내부 사업기회를 찾으려 했지만, 현재 데이터에서는 관련 사업을 충분히 특정하지 못했습니다. "
                "고객사명이나 사업명을 함께 주시면 더 정확히 찾을 수 있습니다."
            ),
            embeddingModel=embedder.config.model_name,
            chatModel="attachment-anchor-engine",
            route="mixed",
            answerStatus="insufficient_evidence",
            excludedSourceTypes=[],
            evidences=build_attachment_anchor_evidences(
                attachment_rows=attachment_rows,
                opportunity_rows=[],
                profile=profile,
                limit=max(limit, 1),
            ),
        )

    top_rows = strong_scored[: max(limit, 3)]
    best = top_rows[0]
    answer_lines = [
        f"핵심 결론: 첨부한 RFP 문서와 가장 관련된 사업기회는 {best['opportunity_name']}입니다.",
        "",
        (
            f"근거: 첨부 문서에서 {format_anchor_summary(profile)}가 확인되고, "
            f"내부 사업기회 중 {best['customer_name']} / {best['opportunity_name']}이(가) 가장 높은 일치도를 보였습니다."
        ),
    ]
    if len(top_rows) > 1:
        answer_lines.extend(
            [
                "",
                "관련 후보:",
                *[
                    (
                        f"- {row['opportunity_name']} ({row['customer_name']}, "
                        f"{row.get('current_status') or '상태미기재'}, {row.get('business_type') or '유형미기재'})"
                    )
                    for row in top_rows[: min(3, len(top_rows))]
                ],
            ]
        )

    evidences = build_attachment_anchor_evidences(
        attachment_rows=attachment_rows,
        opportunity_rows=top_rows,
        profile=profile,
        limit=max(limit, 3),
    )
    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines),
        embeddingModel=embedder.config.model_name,
        chatModel="attachment-anchor-engine",
        route="mixed",
        answerStatus="good_answer",
        excludedSourceTypes=[],
        evidences=evidences[: max(limit, 3)],
    )


def build_attachment_anchor_profile(attachment_rows: list[dict[str, Any]]) -> dict[str, Any]:
    titles = [str(row.get("title") or "").strip() for row in attachment_rows if str(row.get("title") or "").strip()]
    contents = [str(row.get("content") or "").strip() for row in attachment_rows if str(row.get("content") or "").strip()]
    joined_text = "\n".join([*titles, *contents[:2]])

    customer_terms: list[str] = []
    phrase_terms: list[str] = []
    keyword_terms: list[str] = []

    for title in titles:
        for match in re.findall(r"[\(\[（](.*?)[\)\]）]", title):
            term = normalize_anchor_phrase(match)
            if term and term not in customer_terms:
                customer_terms.append(term)

        stripped_title = re.sub(r"\.[A-Za-z0-9]+$", "", title)
        stripped_title = re.sub(r"[\(\[（].*?[\)\]）]", " ", stripped_title)
        for phrase in re.split(r"[/_\-·]+", stripped_title):
            normalized_phrase = normalize_anchor_phrase(phrase)
            if normalized_phrase and normalized_phrase not in phrase_terms:
                phrase_terms.append(normalized_phrase)

    for label in ("수요기관", "발주기관", "사업명", "공고명"):
        matched = re.search(rf"{label}\s*[:：]?\s*([^\n\r]+)", joined_text)
        if matched:
            candidate = normalize_anchor_phrase(matched.group(1))
            if candidate:
                if label in {"수요기관", "발주기관"} and candidate not in customer_terms:
                    customer_terms.append(candidate)
                else:
                    if candidate not in phrase_terms:
                        phrase_terms.append(candidate)
                    if label in {"사업명", "공고명"}:
                        customer_candidate = extract_customer_from_business_phrase(candidate)
                        if customer_candidate and customer_candidate not in customer_terms:
                            customer_terms.append(customer_candidate)
                        for phrase in extract_domain_phrases(candidate):
                            if phrase not in phrase_terms:
                                phrase_terms.append(phrase)

    for token in re.findall(r"[A-Za-z0-9가-힣]+", joined_text.replace(" ", "")):
        normalized_token = normalize_anchor_token(token)
        if normalized_token and normalized_token not in keyword_terms:
            keyword_terms.append(normalized_token)

    return {
        "titles": titles,
        "customer_terms": customer_terms[:5],
        "phrase_terms": phrase_terms[:8],
        "keyword_terms": keyword_terms[:24],
    }


def normalize_anchor_phrase(value: str) -> str | None:
    cleaned = re.sub(r"\s+", " ", value).strip()
    cleaned = re.sub(r"^[0-9.]+", "", cleaned).strip()
    if not cleaned:
        return None
    if len(cleaned) < 2:
        return None
    return cleaned


def extract_customer_from_business_phrase(value: str) -> str | None:
    cleaned = normalize_anchor_phrase(value)
    if not cleaned:
        return None
    candidate = cleaned.replace("(주)", "").replace("주식회사", "").strip()
    split = ATTACHMENT_BUSINESS_SPLIT_PATTERN.split(candidate, maxsplit=1)
    prefix = split[0].strip() if split else candidate
    prefix = re.sub(r"[^\w가-힣&()·\- ]", "", prefix).strip()
    if len(prefix) < 2:
        return None
    return prefix


def extract_domain_phrases(value: str) -> list[str]:
    phrases: list[str] = []
    compact = normalize_compact(value)
    for keyword in ("통합모니터링", "모니터링", "통합관제", "관제", "ems", "itsm", "aiops"):
        normalized_keyword = normalize_compact(keyword)
        if normalized_keyword and normalized_keyword in compact and keyword not in phrases:
            phrases.append(keyword)
    return phrases


def normalize_anchor_token(value: str) -> str | None:
    cleaned = value.strip().lower()
    if not cleaned or len(cleaned) < 2:
        return None
    if cleaned in ATTACHMENT_STOPWORDS:
        return None
    return cleaned


def rank_attachment_related_opportunities(
    *,
    profile: dict[str, Any],
    candidates: list[dict[str, Any]],
    minimum_score: int = 18,
) -> list[dict[str, Any]]:
    scored: list[dict[str, Any]] = []
    customer_terms = [normalize_compact(term) for term in profile.get("customer_terms", []) if normalize_compact(term)]
    phrase_terms = [normalize_compact(term) for term in profile.get("phrase_terms", []) if normalize_compact(term)]
    keyword_terms = [term for term in profile.get("keyword_terms", []) if term]

    for row in candidates:
        customer_name = str(row.get("customer_name") or "")
        opportunity_name = str(row.get("opportunity_name") or "")
        customer_compact = normalize_compact(customer_name)
        opportunity_compact = normalize_compact(opportunity_name)
        combined = f"{customer_compact} {opportunity_compact}"
        score = 0
        reasons: list[str] = []

        for term in customer_terms:
            if term == customer_compact:
                score += 90
                reasons.append(f"customer_exact:{term}")
            elif term and term in customer_compact:
                score += 55
                reasons.append(f"customer_partial:{term}")

        for term in phrase_terms:
            if not term:
                continue
            if term == opportunity_compact:
                score += 70
                reasons.append(f"phrase_exact:{term}")
            elif term in opportunity_compact:
                score += 42
                reasons.append(f"phrase_partial:{term}")
            elif term in customer_compact:
                score += 24
                reasons.append(f"customer_phrase:{term}")

        for token in keyword_terms:
            if token in combined:
                score += 6
                reasons.append(f"keyword:{token}")

        if "모니터링" in opportunity_name and any("모니터링" in term for term in phrase_terms + keyword_terms):
            score += 10
            reasons.append("monitoring_domain")

        if score >= minimum_score:
            enriched = dict(row)
            enriched["attachment_match_score"] = score
            enriched["attachment_match_reasons"] = reasons[:10]
            scored.append(enriched)

    scored.sort(
        key=lambda row: (
            int(row.get("attachment_match_score") or 0),
            int(row.get("expected_amount") or 0),
            str(row.get("contract_date") or ""),
            str(row.get("bid_date") or ""),
        ),
        reverse=True,
    )
    return scored[:5]


def normalize_compact(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9가-힣]", "", value).lower()


def format_anchor_summary(profile: dict[str, Any]) -> str:
    parts: list[str] = []
    customer_terms = profile.get("customer_terms", [])
    phrase_terms = profile.get("phrase_terms", [])
    if customer_terms:
        parts.append(f"고객사 후보 {', '.join(customer_terms[:2])}")
    if phrase_terms:
        parts.append(f"사업명 키워드 {', '.join(phrase_terms[:2])}")
    return ", ".join(parts) if parts else "첨부 문서 제목과 본문 요약"


def build_attachment_anchor_evidences(
    *,
    attachment_rows: list[dict[str, Any]],
    opportunity_rows: list[dict[str, Any]],
    profile: dict[str, Any],
    limit: int,
) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for index, row in enumerate(attachment_rows[:2]):
        evidences.append(
            AnswerEvidence(
                evidenceType="retrieved_evidence",
                sourceType="ATTACHMENT",
                sourceId=str(row.get("source_id") or f"CHAT_SESSION:{index}"),
                title=str(row.get("title") or "첨부 문서"),
                chunkIndex=int(row.get("chunk_index") or 0),
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["session_attachment_anchor"],
                content=str(row.get("content") or "")[:400],
                metadata={
                    "sessionAttachment": True,
                    "customerTerms": profile.get("customer_terms", []),
                    "phraseTerms": profile.get("phrase_terms", []),
                },
            )
        )
    for row in opportunity_rows[: max(limit - len(evidences), 0)]:
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="PROJECT_OPPORTUNITY",
                sourceId=str(row["opportunity_code"]),
                title=f"{row['opportunity_name']} 사업기회",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=float(row.get("attachment_match_score") or 1.0),
                matchedBy=["attachment_anchor_match"],
                content=(
                    f"{row['opportunity_code']} / {row['customer_name']} / {row['opportunity_name']} / "
                    f"{row.get('current_status') or '상태미기재'} / {row.get('business_type') or '유형미기재'}"
                ),
                metadata={
                    "opportunityCode": row["opportunity_code"],
                    "customerName": row["customer_name"],
                    "matchScore": row.get("attachment_match_score"),
                    "matchReasons": row.get("attachment_match_reasons", []),
                },
            )
        )
    return evidences


def answer_pair_metric_comparison(
    *,
    query: str,
    comparison_pairs: list[str],
    metric_key: str,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    resolved = []
    seen_codes: set[str] = set()
    for pair in comparison_pairs:
        entity = resolve_primary_opportunity(query_terms=[pair], exact_codes=extract_business_codes(pair))
        if entity is None:
            continue
        code = str(entity["opportunity_code"])
        if code in seen_codes:
            continue
        seen_codes.add(code)
        resolved.append(entity)
    if len(resolved) < 2:
        return None

    rows = fetch_metric_rows_for_opportunity_codes(
        metric_key=metric_key,
        opportunity_codes=[str(row["opportunity_code"]) for row in resolved],
    )
    if len(rows) < 2:
        return None
    rows.sort(key=lambda row: row.get("metric_value") or 0, reverse=True)
    winner = rows[0]
    loser = rows[1]
    metric_label = metric_label_for_key(metric_key)
    winner_value = format_number(winner.get("metric_value"), suffix=metric_suffix(metric_key))
    loser_value = format_number(loser.get("metric_value"), suffix=metric_suffix(metric_key))
    if (winner.get("metric_value") or 0) == (loser.get("metric_value") or 0):
        answer = "\n".join(
            [
                "핵심 결론: 두 사업의 수치가 동일해 우열을 가르기 어렵습니다.",
                "",
                f"비교 기준: {metric_label}",
                f"{winner['opportunity_name']} ({winner['customer_name']}) / {winner_value}",
                f"{loser['opportunity_name']} ({loser['customer_name']}) / {loser_value}",
                f"근거: {winner['reference_code']}와 {loser['reference_code']} 기준 정형 데이터를 비교했습니다.",
            ]
        )
    else:
        answer = "\n".join(
            [
                f"핵심 결론: {winner['opportunity_name']}이(가) 더 높습니다.",
                "",
                f"비교 기준: {metric_label}",
                f"우세 사업: {winner['opportunity_name']} ({winner['customer_name']}) / {winner_value}",
                f"비교 사업: {loser['opportunity_name']} ({loser['customer_name']}) / {loser_value}",
                f"근거: {winner['reference_code']}와 {loser['reference_code']} 기준 정형 데이터를 비교했습니다.",
            ]
        )
    evidences = build_metric_rank_evidences(rows=rows[:2], intent=StructuredQueryIntent(intent_type="metric_rank", metric_key=metric_key, metric_label=metric_label, result_count=2), limit=2)
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def answer_period_delta_summary(
    *,
    query: str,
    delta_windows: list[str],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse | None:
    if len(delta_windows) < 2:
        return None
    previous_start, previous_end, previous_label = resolve_named_period(delta_windows[0])
    current_start, current_end, current_label = resolve_named_period(delta_windows[1])
    if previous_start is None or current_start is None:
        return None
    previous = fetch_won_summary(start_at=previous_start, end_at=previous_end, limit=max(limit, 3))
    current = fetch_won_summary(start_at=current_start, end_at=current_end, limit=max(limit, 3))
    previous_amount = int(previous["total_contract_amount"] or 0)
    current_amount = int(current["total_contract_amount"] or 0)
    previous_count = int(previous["won_count"] or 0)
    current_count = int(current["won_count"] or 0)
    amount_delta = current_amount - previous_amount
    count_delta = current_count - previous_count
    direction = "증가" if amount_delta >= 0 else "감소"
    answer = "\n".join(
        [
            f"핵심 결론: {current_label} 수주 실적은 {previous_label} 대비 {direction}했습니다.",
            "",
            f"계약 금액: {format_number(current_amount)} / 이전 {format_number(previous_amount)} / 차이 {format_signed_number(amount_delta)}",
            f"수주 건수: {current_count}건 / 이전 {previous_count}건 / 차이 {count_delta:+d}건",
        ]
    )
    evidences = build_won_delta_evidences(
        previous=previous,
        current=current,
        previous_label=previous_label,
        current_label=current_label,
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_difficult_win_response(
    *,
    query: str,
    intent: StructuredQueryIntent,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    header = f"핵심 결론: 수주가 어려웠던 영업기회 중 {intent.metric_label} 사업은 다음과 같습니다."
    bullet_lines = []
    for row in rows:
        issue_summary = row["issue_summary"]
        score = row["difficulty_score"]
        bullet_lines.append(
            f"- {row['opportunity_name']} ({row['customer_name']}, 기준 {row['reference_code']}, "
            f"예상 수주율 {format_number(row.get('expected_win_rate'), suffix='%')}, 난이도 점수 {score:.1f})"
        )
        bullet_lines.append(f"  문제: {issue_summary}")
    evidences = build_difficult_win_evidences(rows=rows[:limit], limit=limit)

    return AnswerResponse(
        query=query,
        answer="\n".join([header, "", *bullet_lines]),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_high_risk_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    top = rows[0]
    answer_lines = [
        f"핵심 결론: PRB 기준으로 현재 가장 리스크가 큰 사업 후보는 {top['opportunity_name']}입니다.",
        "",
        f"고객사: {top.get('customer_name') or '미기재'}",
        f"기준 코드: {top.get('reference_code') or '미기재'}",
        f"예상 수주율: {format_number(top.get('expected_win_rate'), suffix='%')}",
        f"주요 리스크: {top.get('issue_summary') or top.get('risk_factors') or '미기재'}",
        f"경쟁 상황: {top.get('competitor_summary') or top.get('competitor_status') or '미기재'}",
    ]
    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=build_difficult_win_evidences(rows=rows[:limit], limit=limit),
    )


def build_entity_risk_focus_response(
    *,
    query: str,
    opportunity_code: str,
    opportunity_name: str,
    prb_snapshot: dict[str, Any] | None,
    project_rows: list[dict[str, Any]],
    maintenance_rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    customer_name = None
    if prb_snapshot is not None:
        customer_name = prb_snapshot.get("customer_name")
    elif project_rows:
        customer_name = project_rows[0].get("customer_name")
    elif maintenance_rows:
        customer_name = maintenance_rows[0].get("customer_name")

    prb_risk = summarize_text(prb_snapshot.get("risk_factors") if prb_snapshot else None)
    prb_review = summarize_text(prb_snapshot.get("risk_review") if prb_snapshot else None)
    project_points = extract_project_risk_points(project_rows)
    maintenance_points = extract_maintenance_risk_points(maintenance_rows)

    answer_lines = [
        f"핵심 결론: {opportunity_name} 진행 과정에서 가장 주의가 필요했던 리스크는 "
        f"{prb_risk or project_points[0] if project_points else maintenance_points[0] if maintenance_points else '현재 데이터에서 특정 리스크를 명확히 확인하기 어렵습니다.'}",
    ]
    if customer_name:
        answer_lines.extend(["", f"고객사: {customer_name}"])

    if prb_risk or prb_review:
        answer_lines.extend(
            [
                "",
                "사전 심의(PRB) 기준:",
                f"- 핵심 리스크: {prb_risk or '미기재'}",
            ]
        )
        if prb_review and prb_review != prb_risk:
            answer_lines.append(f"- 리스크 검토 의견: {prb_review}")

    if project_points:
        answer_lines.extend(["", "프로젝트 진행 중 확인된 이슈:"])
        answer_lines.extend([f"- {point}" for point in project_points[:2]])

    if maintenance_points:
        answer_lines.extend(["", "운영/유지보수 과정에서 드러난 이슈:"])
        answer_lines.extend([f"- {point}" for point in maintenance_points[:2]])

    if not (project_points or maintenance_points) and prb_snapshot is not None:
        answer_lines.extend(
            [
                "",
                "참고: 현재 확보된 운영/프로젝트 상세 이슈가 많지 않아, PRB에 기록된 리스크를 우선 근거로 제시했습니다.",
            ]
        )

    evidences = build_entity_risk_evidences(
        prb_snapshot=prb_snapshot,
        project_rows=project_rows,
        maintenance_rows=maintenance_rows,
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_metric_rank_response(
    *,
    query: str,
    intent: StructuredQueryIntent,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    rank_position = max(intent.rank_position, 1)
    result_count = max(intent.result_count, 1)
    selected_rows = rows[rank_position - 1 : rank_position - 1 + result_count]
    if not selected_rows:
        return build_empty_structured_response(query=query, embedder=embedder)

    status_phrase = f"{intent.status_label} 상태 기준 " if intent.status_label else ""
    if result_count > 1:
        sort_phrase = metric_rank_descriptor(intent.metric_key, intent.sort_direction)
        answer_lines = [
            f"핵심 결론: {status_phrase}{intent.metric_label} 기준 상위 {result_count}개 사업은 다음과 같습니다.",
            "",
        ]
        for index, row in enumerate(selected_rows, start=rank_position):
            metric_value = format_number(row["metric_value"], suffix=metric_suffix(intent.metric_key))
            answer_lines.append(
                f"{index}위. {row['opportunity_name']} ({row['customer_name']}) - {intent.metric_label} {metric_value}"
            )
            detail_line = build_detail_line(intent=intent, row=row)
            if detail_line:
                answer_lines.append(f"   {detail_line}")
        answer_lines.extend(
            [
                "",
                f"근거: 위 순위는 {selected_rows[0]['reference_code']} 등 관련 정형 근거 기준으로 {intent.metric_label}이 {sort_phrase} 순으로 정렬한 결과입니다.",
            ]
        )
    else:
        target_row = selected_rows[0]
        previous_row = rows[rank_position - 2] if rank_position >= 2 and len(rows) >= rank_position - 1 else None
        next_row = rows[rank_position] if len(rows) > rank_position else None
        sort_phrase = metric_rank_descriptor(intent.metric_key, intent.sort_direction)
        ordinal_label = build_rank_position_label(rank_position)
        headline_phrase = f"{ordinal_label} {sort_phrase}" if rank_position > 1 else f"가장 {sort_phrase}"
        metric_subject = attach_subject_particle(intent.metric_label or "지표")
        metric_value = format_number(target_row["metric_value"], suffix=metric_suffix(intent.metric_key))
        answer_lines = [
            f"핵심 결론: {status_phrase}{metric_subject} {headline_phrase} 사업은 {target_row['opportunity_name']}입니다.",
            "",
            (
                f"근거: {target_row['customer_name']} 고객사의 {attach_topic_particle(target_row['opportunity_name'])} "
                f"{target_row['reference_code']} 기준 {metric_subject} {metric_value}입니다."
            ),
        ]
        comparison_line = build_positional_comparison_line(
            intent=intent,
            rank_position=rank_position,
            previous_row=previous_row,
            next_row=next_row,
        )
        if comparison_line:
            answer_lines.extend(["", comparison_line])

        detail_line = build_detail_line(intent=intent, row=target_row)
        if detail_line:
            answer_lines.extend(["", detail_line])

    evidences = build_metric_rank_evidences(rows=selected_rows, intent=intent, limit=result_count)

    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_document_recency_response(
    *,
    query: str,
    intent: StructuredQueryIntent,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    rank_position = max(intent.rank_position, 1)
    result_count = max(intent.result_count, 1)
    selected_rows = rows[rank_position - 1 : rank_position - 1 + result_count]
    if not selected_rows:
        return build_empty_structured_response(query=query, embedder=embedder)

    scope_label = document_scope_label(intent.document_scope)
    basis_label = "업로드 시각" if intent.recency_basis == "uploaded" else "문서 기준 일자"
    answer_lines: list[str] = []

    if result_count > 1:
        answer_lines.extend([f"핵심 결론: 가장 최근 {scope_label} {result_count}건은 다음과 같습니다.", ""])
        for index, row in enumerate(selected_rows, start=rank_position):
            answer_lines.append(f"{index}위. {row['reference_code']} / {row['opportunity_name']} ({row['customer_name']})")
            detail = build_document_recency_detail(row=row, document_scope=intent.document_scope, basis_label=basis_label)
            if detail:
                answer_lines.append(f"   {detail}")
        answer_lines.extend(["", f"근거: {basis_label} 기준으로 {scope_label}을 최근순 정렬했습니다."])
    else:
        row = selected_rows[0]
        answer_lines.extend(
            [
                f"핵심 결론: 가장 최근 {scope_label}은 {row['reference_code']}입니다.",
                "",
                f"대상 사업: {row['opportunity_name']} ({row['customer_name']})",
            ]
        )
        detail = build_document_recency_detail(row=row, document_scope=intent.document_scope, basis_label=basis_label)
        if detail:
            answer_lines.append(detail)
        answer_lines.extend(["", f"근거: {basis_label} 기준으로 {scope_label}을 최근순 정렬했습니다."])

    evidences = build_document_recency_evidences(rows=selected_rows, document_scope=intent.document_scope)
    return AnswerResponse(
        query=query,
        answer="\n".join(answer_lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def metric_label_for_key(metric_key: str) -> str:
    spec = get_metric_spec(metric_key)
    if spec is not None:
        return spec.metric_label
    mapping = {
        "estimated_profit": "추정 영업이익",
        "estimated_profit_rate": "추정 이익률",
        "expected_win_rate": "예상 수주율",
        "estimated_revenue": "추정 매출액",
        "expected_amount": "예상 사업비",
        "contract_amount": "계약 금액",
        "won": "수주 실적",
    }
    return mapping.get(metric_key, metric_key)


def build_status_list_response(
    *,
    query: str,
    intent: StructuredQueryIntent,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    header = f"핵심 결론: 현재 {intent.status_label or '조건에 맞는'} 상태 사업은 총 {len(rows)}건이 확인됩니다."
    bullet_lines = [
        f"- {row['opportunity_name']} ({row['customer_name']}, 코드 {row['opportunity_code']}, 예상 사업비 {format_number(row['expected_amount'])})"
        for row in rows
    ]

    evidences = build_status_list_evidences(rows=rows[:limit])

    return AnswerResponse(
        query=query,
        answer="\n".join([header, "", "근거 목록:", *bullet_lines]),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_document_recency_detail(*, row: dict[str, Any], document_scope: str | None, basis_label: str) -> str | None:
    if document_scope == "RFP":
        recent_basis = row.get("created_at") if basis_label == "업로드 시각" else row.get("received_date")
        return (
            f"{basis_label}: {format_timestamp(recent_basis)} / 제출 마감: {format_timestamp(row.get('submission_deadline'))} / "
            f"발주기관: {row.get('issuer') or '미기재'}"
        )
    if document_scope == "RFP_ANALYSIS":
        recent_basis = row.get("created_at") if basis_label == "업로드 시각" else row.get("received_date")
        return (
            f"{basis_label}: {format_timestamp(recent_basis)} / 제출 마감: {format_timestamp(row.get('submission_deadline'))} / "
            f"분석 상태: {row.get('analysis_status') or '미기재'}"
        )
    if document_scope == "WON":
        recent_basis = row.get("created_at") if basis_label == "업로드 시각" else row.get("contract_date")
        return (
            f"{basis_label}: {format_timestamp(recent_basis)} / 계약 금액: {format_number(row.get('contract_amount'))} / "
            f"수주보고코드: {row.get('won_report_code') or '미기재'}"
        )
    if document_scope == "LOST":
        recent_basis = row.get("created_at") if basis_label == "업로드 시각" else (row.get("bid_date") or row.get("updated_at"))
        return (
            f"{basis_label}: {format_timestamp(recent_basis)} / 실주 사유: {row.get('win_loss_reason') or '미기재'} / "
            f"입찰결과코드: {row.get('bid_result_code') or '미기재'}"
        )
    if document_scope == "ORDER_REPORT":
        recent_basis = row.get("created_at") if basis_label == "업로드 시각" else row.get("contract_date")
        return (
            f"{basis_label}: {format_timestamp(recent_basis)} / 계약 금액: {format_number(row.get('contract_amount'))} / "
            f"승인 상태: {row.get('approval_status') or '미기재'}"
        )
    if document_scope == "PRB":
        recent_basis = row.get("created_at") if basis_label == "업로드 시각" else row.get("prb_date")
        return f"{basis_label}: {format_timestamp(recent_basis)} / 예상 수주율: {format_number(row.get('expected_win_rate'), suffix='%')}"
    if document_scope == "PRB_RESULT":
        recent_basis = row.get("created_at") if basis_label == "업로드 시각" else row.get("result_date")
        return f"{basis_label}: {format_timestamp(recent_basis)} / 심의 상태: {row.get('decision_status') or '미기재'}"
    return None


def build_comparison_line(*, intent: StructuredQueryIntent, runner_up: dict[str, Any] | None) -> str | None:
    if runner_up is None or intent.metric_label is None:
        return None
    metric_subject = attach_subject_particle(intent.metric_label)
    return (
        f"비교: 다음 순위 사업은 {runner_up['opportunity_name']}이며, "
        f"{metric_subject} {format_number(runner_up['metric_value'], suffix=metric_suffix(intent.metric_key))}입니다."
    )


def build_positional_comparison_line(
    *,
    intent: StructuredQueryIntent,
    rank_position: int,
    previous_row: dict[str, Any] | None,
    next_row: dict[str, Any] | None,
) -> str | None:
    comparisons: list[str] = []
    metric_subject = attach_subject_particle(intent.metric_label or "지표")
    if previous_row is not None:
        comparisons.append(
            f"바로 앞 순위는 {previous_row['opportunity_name']}이며, {metric_subject} "
            f"{format_number(previous_row['metric_value'], suffix=metric_suffix(intent.metric_key))}입니다."
        )
    if next_row is not None:
        comparisons.append(
            f"바로 다음 순위는 {next_row['opportunity_name']}이며, {metric_subject} "
            f"{format_number(next_row['metric_value'], suffix=metric_suffix(intent.metric_key))}입니다."
        )
    if not comparisons:
        return None
    return "비교: " + " ".join(comparisons)


def build_rank_position_label(rank_position: int) -> str:
    labels = {
        2: "두 번째",
        3: "세 번째",
        4: "네 번째",
        5: "다섯 번째",
    }
    return labels.get(rank_position, f"{rank_position}번째")


def attach_topic_particle(text: str) -> str:
    if not text:
        return text
    last_char = text[-1]
    code = ord(last_char)
    if 0xAC00 <= code <= 0xD7A3:
        has_batchim = (code - 0xAC00) % 28 != 0
        return f"{text}{'은' if has_batchim else '는'}"
    return f"{text}는"


def attach_subject_particle(text: str) -> str:
    if not text:
        return text
    last_char = text[-1]
    code = ord(last_char)
    if 0xAC00 <= code <= 0xD7A3:
        has_batchim = (code - 0xAC00) % 28 != 0
        return f"{text}{'이' if has_batchim else '가'}"
    return f"{text}가"


def build_detail_line(*, intent: StructuredQueryIntent, row: dict[str, Any]) -> str | None:
    if intent.metric_key == "activity_recency_gap_days":
        latest = row.get("latest_activity_at") or "미기재"
        return (
            f"세부 수치: 마지막 활동 시각 {latest}, "
            f"누적 활동 {row.get('activity_count') or 0}건입니다."
        )
    if intent.metric_key == "pipeline_data_completeness_index":
        missing = row.get("missing_fields") or "주요 필드 누락 없음"
        return f"세부 수치: 누락 항목은 {missing}입니다."
    if intent.metric_key == "proposal_lift_probability":
        bid_date = row.get("bid_date") or "미기재"
        return (
            f"세부 수치: 최근 활동 {row.get('recent_activity_count') or 0}건, "
            f"RFP {row.get('rfp_count') or 0}건, PRB {row.get('prb_count') or 0}건, "
            f"예상 입찰일 {bid_date}입니다."
        )
    if intent.metric_key == "free_to_paid_conversion_propensity":
        return (
            f"세부 수치: 무상 종료까지 {row.get('days_to_end') or 0}일, "
            f"지원 이력 {row.get('support_count') or 0}건, "
            f"전환 견적 {row.get('quote_count') or 0}건입니다."
        )
    if intent.metric_key == "risk_exposure_index":
        return (
            f"세부 수치: 예상 수주율 {format_number(row.get('expected_win_rate'), suffix='%')}, "
            f"주요 리스크는 {row.get('issue_summary') or row.get('risk_factors') or '미기재'}입니다."
        )
    if intent.metric_key == "estimated_profit":
        return (
            f"세부 수치: 추정 매출액 {format_number(row.get('estimated_revenue'))}, "
            f"추정 이익률 {format_number(row.get('estimated_profit_rate'), suffix='%')}, "
            f"예상 수주율 {format_number(row.get('expected_win_rate'), suffix='%')}입니다."
        )
    if intent.metric_key == "estimated_profit_rate":
        return (
            f"세부 수치: 추정 영업이익 {format_number(row.get('estimated_profit'))}, "
            f"추정 매출액 {format_number(row.get('estimated_revenue'))}입니다."
        )
    if intent.metric_key == "expected_win_rate":
        return (
            f"세부 수치: 예상 수주율 {format_number(row.get('expected_win_rate'), suffix='%')}, "
            f"추정 영업이익 {format_number(row.get('estimated_profit'))}입니다."
        )
    if intent.metric_key == "estimated_revenue":
        return (
            f"세부 수치: 추정 매출액 {format_number(row.get('estimated_revenue'))}, "
            f"추정 영업이익 {format_number(row.get('estimated_profit'))}입니다."
        )
    if intent.metric_key == "expected_amount":
        return (
            f"세부 수치: 예상 사업비 {format_number(row.get('expected_amount'))}, "
            f"현재 상태는 {row.get('current_status')}입니다."
        )
    if intent.metric_key == "contract_amount":
        return (
            f"세부 수치: 계약 금액 {format_number(row.get('contract_amount'))}, "
            f"매출 분류는 {row.get('revenue_category') or '미기재'}입니다."
        )
    return None


def build_empty_structured_response(*, query: str, embedder: EmbeddingModel) -> AnswerResponse:
    return AnswerResponse(
        query=query,
        answer="조건에 맞는 정형 데이터가 없어 답변을 구성하지 못했습니다.",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=[],
    )


def resolve_named_period(window_name: str) -> tuple[str | None, str | None, str]:
    now = datetime.now(KST).replace(microsecond=0)
    if window_name == "previous_month":
        first_of_current = now.replace(day=1, hour=0, minute=0, second=0)
        end = first_of_current - timedelta(seconds=1)
        start = end.replace(day=1, hour=0, minute=0, second=0)
        return start.isoformat(), end.isoformat(), "지난달"
    if window_name == "current_month":
        start = now.replace(day=1, hour=0, minute=0, second=0)
        return start.isoformat(), now.isoformat(), "이번 달"
    if window_name == "previous_year":
        start = now.replace(year=now.year - 1, month=1, day=1, hour=0, minute=0, second=0)
        end = now.replace(year=now.year - 1, month=12, day=31, hour=23, minute=59, second=59)
        return start.isoformat(), end.isoformat(), "작년"
    if window_name == "current_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0)
        return start.isoformat(), now.isoformat(), "올해"
    if window_name == "first_half":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0)
        end = now.replace(month=6, day=30, hour=23, minute=59, second=59)
        return start.isoformat(), end.isoformat(), "상반기"
    if window_name == "second_half":
        start = now.replace(month=7, day=1, hour=0, minute=0, second=0)
        end = now.replace(month=12, day=31, hour=23, minute=59, second=59)
        return start.isoformat(), end.isoformat(), "하반기"
    return None, None, window_name


def format_signed_number(value: int | float | Decimal | None) -> str:
    number = int(value or 0)
    sign = "+" if number >= 0 else "-"
    return f"{sign}{format_number(abs(number))}"


def build_won_delta_evidences(
    *,
    previous: dict[str, Any],
    current: dict[str, Any],
    previous_label: str,
    current_label: str,
    limit: int,
) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for index, (label, summary) in enumerate(((previous_label, previous), (current_label, current))):
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType="WON",
                sourceId=f"won-summary:{label}",
                title=f"{label} 수주 실적 요약",
                chunkIndex=index,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_delta"],
                content=(
                    f"{label} / 수주 건수 {summary.get('won_count') or 0}건 / "
                    f"총 계약 금액 {format_number(summary.get('total_contract_amount'))}"
                ),
                metadata={
                    "label": label,
                    "wonCount": int(summary.get("won_count") or 0),
                    "totalContractAmount": int(summary.get("total_contract_amount") or 0),
                },
            )
        )
    return evidences[: max(limit, 2)]


def build_structured_data_unavailable_response(*, query: str, embedder: EmbeddingModel) -> AnswerResponse:
    return AnswerResponse(
        query=query,
        answer=(
            "현재 해당 유형의 집계·랭킹 조회를 위한 데이터가 충분히 적재되지 않았습니다. "
            "사업기회별 수치(금액, 횟수 등) 또는 순위 기반 질문은 데이터가 보강된 이후 이용 가능합니다. "
            "대신 특정 사업 이름이나 고객사, 활동 내용으로 검색하시면 관련 문서를 찾아드릴 수 있습니다."
        ),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        route="fast_structured",
        answerStatus="insufficient_evidence",
        excludedSourceTypes=[],
        evidences=[],
    )


def build_opportunity_status_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    canonical = adapt_opportunity_snapshot(snapshot)
    answer = "\n".join(
        [
            f"핵심 결론: {canonical.opportunityName}의 현재 상태는 {canonical.currentStatus or '미기재'}입니다.",
            "",
            f"고객사: {canonical.customerName or '미기재'}",
            f"사업유형: {canonical.businessType or '미기재'}",
            f"예상 사업비: {format_number(canonical.expectedAmount)}",
            f"주요 내용: {canonical.mainContent or '미기재'}",
            f"이슈: {canonical.issueContent or '미기재'}",
            f"경쟁 상황: {canonical.competitorStatus or '미기재'}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["current_status", "main_content", "issue_content"]),
            ("RFP", "rfp_analysis_code", "opportunity_name", ["customer_name"]),
            ("PRB", "prb_code", "opportunity_name", ["competitor_status"]),
            ("RFP_ANALYSIS", "rfp_analysis_code", "opportunity_name", ["customer_name"]),
            ("WON", "opportunity_code", "opportunity_name", ["won_report_code", "contract_amount"]),
            ("ORDER_REPORT", "won_report_code", "opportunity_name", ["current_status"]),
            ("CONTRACT", "contract_code", "opportunity_name", ["current_status"]),
            ("PROJECT", "project_code", "opportunity_name", ["business_type"]),
            ("MAINTENANCE", "maintenance_code", "opportunity_name", ["current_status"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_opportunity_identity_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    canonical = adapt_opportunity_snapshot(snapshot)
    answer = "\n".join(
        [
            f"핵심 결론: {canonical.opportunityCode}는 {canonical.customerName or '미기재'} 고객사의 {canonical.opportunityName} 사업입니다.",
            "",
            f"고객군: {canonical.customerGroup or '미기재'}",
            f"고객 유형: {canonical.customerType or '미기재'}",
            f"현재 상태: {canonical.currentStatus or '미기재'}",
            f"사업유형: {canonical.businessType or '미기재'}",
            f"예상 사업비: {format_number(canonical.expectedAmount)}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["customer_name", "current_status", "business_type"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_customer_decision_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    canonical = adapt_opportunity_snapshot(snapshot)
    answer = "\n".join(
        [
            f"핵심 결론: {canonical.opportunityName}의 고객사 의사결정 구조는 다음과 같이 정리되어 있습니다.",
            "",
            f"고객사: {canonical.customerName or '미기재'}",
            f"의사결정 구조: {canonical.decisionStructure or '미기재'}",
            f"주요 연락선: {canonical.contactLine or '미기재'}",
            f"현재 상태: {canonical.currentStatus or '미기재'}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["decision_structure", "contact_line", "current_status"]),
            ("RFP", "rfp_analysis_code", "opportunity_name", ["customer_name", "current_status"]),
            ("RFP_ANALYSIS", "rfp_analysis_code", "opportunity_name", ["customer_name", "current_status"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_workflow_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    canonical = adapt_workflow_snapshot(snapshot)
    preferred_stage_key = resolve_requested_workflow_stage(query)
    preferred_stage = next((stage for stage in canonical.stages if stage.stageKey == preferred_stage_key), None)
    focus_stage_obj = preferred_stage or next((stage for stage in canonical.stages if stage.isCurrentFocus), None)
    focus_stage = focus_stage_obj.stageLabel if focus_stage_obj is not None else "확인 가능한 결재 흐름"
    lines = [
        f"핵심 결론: {canonical.opportunityName}의 현재 workflow 초점은 {focus_stage}이며 상태는 {(focus_stage_obj.statusRaw if focus_stage_obj and focus_stage_obj.statusRaw else canonical.overallWorkflowLabel)}입니다.",
        "",
        f"고객사: {canonical.customerName or '미기재'}",
        f"사업 현재 상태: {canonical.currentStatus or '미기재'}",
    ]
    if preferred_stage_key and preferred_stage is None:
        lines.append("요청한 workflow 단계에 대한 상태 정보는 현재 확인되지 않았습니다.")
        if canonical.highlights:
            lines.append("대신 현재 확인 가능한 단계는 다음과 같습니다.")
    if canonical.highlights:
        lines.append("주요 단계:")
        lines.extend(f"- {item}" for item in canonical.highlights[:4])

    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("ACTIVITY_REQUEST", "request_code", "opportunity_name", ["request_type", "activity_request_status", "activity_request_date", "activity_request_approved_at"]),
            ("PRB_RESULT", "prb_result_code", "opportunity_name", ["decision_status", "prb_result_date", "final_opinion"]),
            ("ORDER_REPORT", "won_report_code", "opportunity_name", ["approval_status", "contract_date", "business_scope"]),
            ("CONTRACT", "contract_code", "opportunity_name", ["contract_status", "contract_signed_at", "contract_memo"]),
        ],
        limit=max(limit, 4),
    )[: max(limit, 4)]
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        route="fast_structured",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        confidenceBand="high",
        confidenceReasons=["workflow_snapshot"],
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_prb_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    answer = "\n".join(
        [
            f"핵심 결론: {snapshot['opportunity_name']}의 PRB 기준 예상 수주율은 {format_number(snapshot.get('expected_win_rate'), suffix='%')}입니다.",
            "",
            f"추정 매출액: {format_number(snapshot.get('estimated_revenue'))}",
            f"추정 영업이익: {format_number(snapshot.get('estimated_profit'))}",
            f"추정 이익률: {format_number(snapshot.get('estimated_profit_rate'), suffix='%')}",
            f"영업 의견: {snapshot.get('sales_opinion') or '미기재'}",
            f"리스크: {snapshot.get('risk_factors') or '미기재'}",
            f"심의 결과: {snapshot.get('decision_status') or '미기재'}",
            f"최종 의견: {snapshot.get('final_opinion') or '미기재'}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("PRB", "prb_code", "opportunity_name", ["expected_win_rate", "estimated_profit", "risk_factors"]),
            ("PRB_RESULT", "prb_result_code", "opportunity_name", ["decision_status", "final_opinion"]),
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["current_status"]),
            ("BID_RESULT", "bid_result_code", "opportunity_name", ["won", "win_loss_reason"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_rfp_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    requirement_rows = extract_rfp_requirement_rows(snapshot)
    matched_rows = select_matching_rfp_rows(query=query, rows=requirement_rows)
    detail_requested = is_rfp_requirement_detail_query(query)

    lines: list[str] = []
    if detail_requested and matched_rows:
        focus = matched_rows[0].get("requirementTitle") or matched_rows[0].get("category") or "요구사항"
        lines.append(
            f"핵심 결론: {snapshot['opportunity_name']}의 RFP 분석에서 {focus} 관련 검토 결과는 다음과 같습니다."
        )
        lines.append("")
        for row in matched_rows[:3]:
            lines.append(
                f"- {row.get('requirementTitle') or row.get('category') or '요구사항'}"
                f": 지원 여부 {row.get('supportStatus') or '미기재'}"
                f", 공수 {format_effort_value(row.get('effort'))}"
            )
            lines.append(f"  검토 내용: {row.get('reviewNote') or row.get('requirementContent') or '미기재'}")
    else:
        lines.extend(
            [
                f"핵심 결론: {snapshot['opportunity_name']}의 RFP 핵심 요구는 {snapshot.get('requirements') or '미기재'}입니다.",
                "",
                f"발행 기관: {snapshot.get('issuer') or snapshot.get('customer_name') or '미기재'}",
                f"RFP 확보 시점: {describe_rfp_origin(snapshot.get('rfp_origin'))}",
                f"제출 마감: {snapshot.get('submission_deadline') or '미기재'}",
                f"사업 범위: {snapshot.get('project_scope') or '미기재'}",
                f"보안 요구: {snapshot.get('security_requirements') or '미기재'}",
                f"리스크: {snapshot.get('risk_factors') or '미기재'}",
                f"분석 상태: {snapshot.get('analysis_status') or '미기재'}",
            ]
        )
        if requirement_rows:
            lines.append("")
            lines.append(f"주요 요구사항 {min(len(requirement_rows), 3)}건:")
            for row in requirement_rows[:3]:
                lines.append(
                    f"- {row.get('requirementTitle') or row.get('category') or '요구사항'}"
                    f" / 지원 여부 {row.get('supportStatus') or '미기재'}"
                    f" / 공수 {format_effort_value(row.get('effort'))}"
                )

    answer = "\n".join(lines)
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("RFP", "rfp_analysis_code", "opportunity_name", ["requirements", "security_requirements"]),
            ("RFP_ANALYSIS", "rfp_analysis_code", "opportunity_name", ["requirements", "security_requirements", "analysis_status"]),
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["current_status"]),
        ],
        limit=max(2, limit),
    )
    evidences.extend(
        build_rfp_requirement_row_evidences(
            snapshot=snapshot,
            rows=(matched_rows or requirement_rows)[: max(1, limit)],
            offset=len(evidences),
        )
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences[: max(limit, 3)],
    )


def build_bid_loss_reason_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    loss_reason = snapshot.get("win_loss_reason") or snapshot.get("risk_review") or snapshot.get("final_opinion")
    answer = "\n".join(
        [
            f"핵심 결론: {snapshot['opportunity_name']}의 실주/승패 사유는 {loss_reason or '미기재'}입니다.",
            "",
            f"고객사: {snapshot.get('customer_name') or '미기재'}",
            f"현재 상태: {snapshot.get('current_status') or '미기재'}",
            f"경쟁 상황: {snapshot.get('competitor_summary') or '미기재'}",
            f"PRB 예상 수주율: {format_number(snapshot.get('expected_win_rate'), suffix='%')}",
            f"리스크: {snapshot.get('risk_factors') or '미기재'}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("LOST", "opportunity_code", "opportunity_name", ["current_status", "win_loss_reason", "competitor_summary"]),
            ("BID_RESULT", "bid_result_code", "opportunity_name", ["won", "win_loss_reason", "competitor_summary"]),
            ("PRB_RESULT", "prb_result_code", "opportunity_name", ["final_opinion", "risk_review"]),
            ("PRB", "prb_code", "opportunity_name", ["expected_win_rate", "risk_factors"]),
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["current_status"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_contract_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    canonical = adapt_contract_snapshot(snapshot)
    answer = "\n".join(
        [
            f"핵심 결론: {canonical.opportunityName}의 계약 코드 {canonical.contractCode}는 {canonical.contractStatus or '미기재'} 상태입니다.",
            "",
            f"고객사: {canonical.customerName or '미기재'}",
            f"계약 금액: {format_number(canonical.contractAmount)}",
            f"계약 일자: {canonical.contractDate or '미기재'}",
            f"계약 기간: {canonical.contractStartDate or '미기재'} ~ {canonical.contractEndDate or '미기재'}",
            f"대금 조건: {canonical.paymentTerms or '미기재'}",
            f"사업 범위: {canonical.businessScope or '미기재'}",
            f"특이사항: {canonical.specialNotes or '미기재'}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("CONTRACT", "contract_code", "opportunity_name", ["contract_status", "contract_date", "contract_amount"]),
            ("WON", "opportunity_code", "opportunity_name", ["won_report_code", "contract_amount"]),
            ("ORDER_REPORT", "won_report_code", "opportunity_name", ["contract_amount"]),
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["current_status"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_contract_maintenance_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [
        (
            f"핵심 결론: {snapshot.get('opportunity_name') or '해당 사업'}은 "
            f"{snapshot.get('contract_code') or snapshot.get('won_report_code') or '계약 정보 미기재'} 기준으로 "
            f"계약이 진행되었고, 현재 유지보수는 {snapshot.get('maintenance_type') or '미기재'} 조건으로 운영되고 있습니다."
        ),
        "",
        f"고객사: {snapshot.get('customer_name') or '미기재'}",
        f"수주/계약 금액: {format_number(snapshot.get('contract_amount'))}",
        f"계약 일자: {snapshot.get('contract_date') or '미기재'}",
        f"계약 기간: {snapshot.get('contract_start_date') or '미기재'} ~ {snapshot.get('contract_end_date') or '미기재'}",
        f"대금 조건: {snapshot.get('payment_terms') or '미기재'}",
        f"사업 범위: {snapshot.get('business_scope') or '미기재'}",
        f"유지보수 코드: {snapshot.get('maintenance_code') or '미기재'}",
        f"유지보수 기간: {snapshot.get('maintenance_start_date') or '미기재'} ~ {snapshot.get('maintenance_end_date') or '미기재'}",
        f"유지보수 계약 금액: {format_number(snapshot.get('maintenance_contract_amount'))}",
        f"유지보수 메모: {snapshot.get('maintenance_remarks') or '미기재'}",
    ]
    if snapshot.get("support_content") or snapshot.get("support_result"):
        lines.extend(
            [
                f"최근 지원: {format_datetime(snapshot.get('support_started_at')) or '미기재'} / {snapshot.get('support_activity_type') or '미기재'}",
                f"최근 지원 내용: {snapshot.get('support_content') or '미기재'}",
                f"최근 지원 결과: {snapshot.get('support_result') or '미기재'}",
            ]
        )

    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("WON", "opportunity_code", "opportunity_name", ["won_report_code", "contract_amount", "payment_terms"]),
            ("ORDER_REPORT", "won_report_code", "opportunity_name", ["contract_date", "contract_amount", "business_scope", "special_notes"]),
            ("CONTRACT", "contract_code", "opportunity_name", ["contract_status", "contract_start_date", "contract_end_date", "contract_memo"]),
            ("MAINTENANCE", "maintenance_code", "opportunity_name", ["maintenance_type", "maintenance_start_date", "maintenance_end_date", "maintenance_contract_amount"]),
            ("CUSTOMER_SUPPORT", "support_code", "opportunity_name", ["support_activity_type", "support_started_at", "support_result"]),
        ],
        limit=max(3, limit),
    )
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        route="fast_structured",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        confidenceBand="high",
        confidenceReasons=["contract_maintenance_snapshot"],
        excludedSourceTypes=[],
        evidences=evidences[: max(limit, 3)],
    )


def build_project_maintenance_summary_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [
        (
            f"핵심 결론: {snapshot.get('opportunity_name') or '해당 사업'}은 "
            f"프로젝트 {snapshot.get('project_code') or '미기재'} 단계와 유지보수 {snapshot.get('maintenance_code') or '미기재'} 운영 상태를 함께 확인할 수 있습니다."
        ),
        "",
        f"고객사: {snapshot.get('customer_name') or '미기재'}",
        f"프로젝트 상태: {snapshot.get('project_status') or '미기재'}",
        f"프로젝트 오너/팀: {snapshot.get('project_owner') or '미기재'} / {snapshot.get('team_name') or '미기재'}",
        f"프로젝트 개요: {snapshot.get('project_overview') or '미기재'}",
        f"최근 결과보고: {snapshot.get('project_report_code') or '미기재'} / {snapshot.get('project_result_status') or '미기재'}",
        f"유지보수 유형: {snapshot.get('maintenance_type') or '미기재'}",
        f"유지보수 기간: {snapshot.get('maintenance_start_date') or '미기재'} ~ {snapshot.get('maintenance_end_date') or '미기재'}",
        f"최근 지원 내용: {snapshot.get('support_content') or '미기재'}",
        f"최근 지원 결과: {snapshot.get('support_result') or '미기재'}",
    ]
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("PROJECT", "project_code", "opportunity_name", ["project_status", "project_owner", "team_name"]),
            ("PROJECT_RESULT_REPORT", "project_report_code", "opportunity_name", ["project_result_status"]),
            ("MAINTENANCE", "maintenance_code", "opportunity_name", ["maintenance_type", "maintenance_start_date", "maintenance_end_date"]),
            ("CUSTOMER_SUPPORT", "support_code", "opportunity_name", ["support_activity_type", "support_started_at", "support_result"]),
        ],
        limit=max(3, limit),
    )
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        route="fast_structured",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        confidenceBand="high",
        confidenceReasons=["project_maintenance_snapshot"],
        excludedSourceTypes=[],
        evidences=evidences[: max(limit, 3)],
    )


def build_support_issue_response(
    *,
    query: str,
    opportunity_code: str,
    opportunity_name: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    incident_rows = filter_support_issue_rows(rows, query=query)
    selected_rows = incident_rows or rows[: min(len(rows), 3)]
    header_row = selected_rows[0]
    lines = [
        f"핵심 결론: {opportunity_name}의 지원/장애 대응 이력 중 관련 내용은 다음과 같습니다.",
        "",
        f"대표 대응: {header_row.get('activity_date') or '미기재'} / {header_row.get('activity_type') or '활동'}",
        f"주요 내용: {header_row.get('activity_content') or '미기재'}",
        f"조치 결과: {header_row.get('performance') or '미기재'}",
    ]
    if len(selected_rows) > 1:
        lines.append("")
        lines.append("관련 이력:")
        for row in selected_rows[1:3]:
            lines.append(
                f"- {row.get('activity_date') or '미기재'} / {row.get('activity_type') or '활동'} / "
                f"{row.get('activity_content') or '미기재'} / 결과 {row.get('performance') or '미기재'}"
            )
    evidences = build_support_row_evidences(rows=selected_rows[: max(limit, 1)])
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        route="fast_structured",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        confidenceBand="high",
        confidenceReasons=["support_issue_history"],
        excludedSourceTypes=[],
        evidences=evidences[: max(limit, 2)],
    )


def build_support_issue_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [
        f"핵심 결론: {snapshot.get('opportunity_name') or '해당 사업'}의 최근 지원/장애 대응 정보는 다음과 같습니다.",
        "",
        f"고객사: {snapshot.get('customer_name') or '미기재'}",
        f"지원 시각: {format_datetime(snapshot.get('support_started_at')) or '미기재'}",
        f"지원 유형: {snapshot.get('support_activity_type') or '미기재'}",
        f"지원 내용: {snapshot.get('support_content') or '미기재'}",
        f"조치 결과: {snapshot.get('support_result') or '미기재'}",
    ]
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("CUSTOMER_SUPPORT", "support_code", "opportunity_name", ["support_activity_type", "support_started_at", "support_result"]),
            ("MAINTENANCE", "maintenance_code", "opportunity_name", ["maintenance_type", "maintenance_remarks"]),
        ],
        limit=max(2, limit),
    )
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        route="fast_structured",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        confidenceBand="medium",
        confidenceReasons=["support_issue_snapshot"],
        excludedSourceTypes=[],
        evidences=evidences[: max(limit, 2)],
    )


def build_quotation_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    solution_items = [item for item in (snapshot.get("solution_items") or []) if isinstance(item, dict)]
    labor_items = [item for item in (snapshot.get("labor_items") or []) if isinstance(item, dict)]
    top_modules = [
        (
            f"- {item.get('product_name') or '모듈 미기재'}"
            f" / 수량 {item.get('quantity') or 0}"
            f" / 공급가 {format_number(item.get('supply_total_price'))}"
        )
        for item in solution_items[:3]
    ]

    version_lines = build_snapshot_version_lines(snapshot)
    lines = [
        f"핵심 결론: {snapshot.get('quotation_code') or '견적코드 미기재'} 견적은 총 {format_number(snapshot.get('total_price'))}이며 지급 조건은 {snapshot.get('payment_condition') or '미기재'}입니다.",
        "",
        f"고객사: {snapshot.get('customer_name') or '미기재'}",
        f"사업기회: {snapshot.get('opportunity_name') or snapshot.get('opportunity_code') or '미기재'}",
        f"견적일: {snapshot.get('quotation_date') or '미기재'}",
        f"소비자 총액: {format_number(snapshot.get('consumer_total_price'))}",
        f"공급 총액: {format_number(snapshot.get('supply_total_price'))}",
        f"인건비 총액: {format_number(snapshot.get('labor_total_price'))}",
    ]
    lines.extend(version_lines)
    lines.append(f"비고: {snapshot.get('note') or '미기재'}")

    if top_modules:
        lines.append("주요 모듈:")
        lines.extend(top_modules)

    if labor_items:
        lines.append(
            f"인건비 항목 수: {len(labor_items)}건"
        )

    evidences = build_snapshot_evidences(
        snapshot,
        [
            (
                "QUOTATION",
                "quotation_code",
                "opportunity_name",
                [
                    "quotation_date",
                    "payment_condition",
                    "total_price",
                    "document_series_code",
                    "document_version",
                    "is_latest_version",
                ],
            ),
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["customer_name"]),
        ],
        limit=max(2, limit),
    )

    for index, item in enumerate(solution_items[: max(0, limit - len(evidences))]):
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="MODULE",
                sourceId=str(item.get("module_id") or item.get("product_name") or snapshot.get("quotation_code")),
                title=f"{snapshot.get('quotation_code') or '견적'} 모듈 항목 #{index + 1}",
                chunkIndex=index,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{item.get('product_name') or '모듈 미기재'} / "
                    f"{item.get('product_group') or '그룹 미기재'} / "
                    f"수량 {item.get('quantity') or 0} / "
                    f"공급가 {format_number(item.get('supply_total_price'))}"
                ),
                metadata={
                    "quotationCode": snapshot.get("quotation_code"),
                    "opportunityCode": snapshot.get("opportunity_code"),
                },
            )
        )

    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        route="fast_structured",
        answerStatus="good_answer",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        confidenceBand="high",
        confidenceReasons=["quotation_snapshot"],
        excludedSourceTypes=[],
        evidences=evidences[: max(limit, 3)],
    )


def build_project_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    canonical = adapt_project_snapshot(snapshot)
    answer = "\n".join(
        [
            f"핵심 결론: {canonical.projectCode}는 {canonical.opportunityCode or '기회코드 미기재'} {canonical.opportunityName}에 연결된 프로젝트이며 현재 상태는 {canonical.projectStatus or '미기재'}입니다.",
            "",
            f"고객사: {canonical.customerName or '미기재'}",
            f"PJT 번호: {canonical.pjtNo or '미기재'}",
            f"프로젝트 유형: {canonical.projectType or '미기재'}",
            f"프로젝트 오너: {canonical.projectOwner or '미기재'}",
            f"팀: {canonical.teamName or '미기재'}",
            f"납기일: {canonical.deliveryDate or '미기재'}",
            f"최근 보고: {canonical.latestReportCode or '미기재'} / {canonical.latestResultStatus or '미기재'}",
            f"최근 보고 내용: {canonical.latestReportContent or '미기재'}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("PROJECT", "project_code", "opportunity_name", ["project_status", "delivery_date"]),
            ("PROJECT_RESULT_REPORT", "project_report_code", "opportunity_name", ["result_status", "detail_content"]),
            ("WON", "opportunity_code", "opportunity_name", ["won_report_code", "customer_name"]),
            ("ORDER_REPORT", "won_report_code", "opportunity_name", ["customer_name"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_generic_maintenance_quote_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    selected = rows[0]
    items = selected.get("items") or []
    periodic = next(
        (
            item
            for item in items
            if "정기점검" in str(item.get("service_content") or "")
            or "정기점검" in str(item.get("service_item") or "")
        ),
        None,
    )
    emergency = next(
        (
            item
            for item in items
            if "긴급" in str(item.get("service_content") or "")
            or "장애" in str(item.get("service_content") or "")
            or "긴급" in str(item.get("service_item") or "")
        ),
        None,
    )
    answer = "\n".join(
        [
            f"핵심 결론: 최근 유지보수 견적 기준으로 {selected['opportunity_name']} 건에서 관련 항목이 가장 구체적으로 확인됩니다.",
            "",
            f"사업기회: {selected.get('opportunity_code') or '미기재'} / {selected.get('customer_name') or '미기재'}",
            f"정기점검 관련: {(periodic or {}).get('service_content') or (periodic or {}).get('service_item') or '미기재'}",
            f"긴급 장애 대응: {(emergency or {}).get('service_content') or (emergency or {}).get('service_item') or '미기재'}",
            f"월 공급가: {format_number(selected.get('monthly_supply_amount'))}",
            f"총 견적: {format_number(selected.get('quote_amount_total'))}",
        ]
    )
    evidences = build_maintenance_quote_evidences(snapshot=selected, limit=limit)
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_maintenance_snapshot_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    canonical = adapt_maintenance_snapshot(snapshot)
    answer = "\n".join(
        [
            f"핵심 결론: {canonical.maintenanceCode}는 {canonical.opportunityName}에 연결된 {canonical.contractType or '미기재'} 유지보수이며 현재 상태는 {canonical.status or '미기재'}입니다.",
            "",
            f"고객사: {canonical.customerName or '미기재'}",
            f"유지보수 기간: {canonical.maintenanceStartDate or '미기재'} ~ {canonical.maintenanceEndDate or '미기재'}",
            f"운영 내용: {canonical.detailContent or '미기재'}",
            f"최근 지원: {canonical.latestSupportDate or '미기재'} / {canonical.latestSupportType or '미기재'}",
            f"최근 지원 내용: {canonical.latestSupportContent or '미기재'}",
            f"최근 지원 결과: {canonical.latestSupportPerformance or '미기재'}",
        ]
    )
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("MAINTENANCE", "maintenance_code", "opportunity_name", ["contract_type", "status", "maintenance_start_date", "maintenance_end_date"]),
            ("CUSTOMER_SUPPORT", "support_code", "opportunity_name", ["activity_type", "activity_date", "performance"]),
            ("PROJECT_OPPORTUNITY", "opportunity_code", "opportunity_name", ["customer_name"]),
        ],
        limit=limit,
    )
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_evidence_inventory_response(
    *,
    query: str,
    opportunity_code: str,
    opportunity_name: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [f"핵심 결론: {opportunity_code} {opportunity_name}에서 현재 확인되는 근거 문서/데이터 종류는 다음과 같습니다.", ""]
    evidences: list[AnswerEvidence] = []
    for index, row in enumerate(rows[:limit]):
        source_type = str(row["source_type"])
        label = document_scope_label(source_type)
        lines.append(f"- {label}: {row.get('item_count') or 0}건")
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType=source_type,
                sourceId=str(row.get("source_id") or opportunity_code),
                title=f"{opportunity_name} 근거 종류 요약",
                chunkIndex=index,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["inventory_summary"],
                content=f"{label} / {row.get('item_count') or 0}건",
                metadata={"opportunityCode": opportunity_code},
            )
        )
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_maintenance_list_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    title: str,
    intro: str,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [intro, "", f"{title}:"]
    evidences: list[AnswerEvidence] = []
    for row in rows[:5]:
        lines.append(
            f"- {row['opportunity_name']} ({row['customer_name']}, {row['maintenance_code']}, "
            f"{row.get('contract_type') or '유형미기재'}, {row.get('status') or '상태미기재'}, "
            f"{row.get('maintenance_start_date') or '시작일 미기재'} ~ {row.get('maintenance_end_date') or '종료일 미기재'})"
        )
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="MAINTENANCE",
                sourceId=str(row["maintenance_code"]),
                title=f"{row['opportunity_name']} 유지보수",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row['opportunity_name']} / {row['customer_name']} / {row['maintenance_code']} / "
                    f"{row.get('contract_type') or '유형미기재'} / {row.get('status') or '상태미기재'} / "
                    f"{row.get('maintenance_start_date') or '시작일 미기재'} ~ {row.get('maintenance_end_date') or '종료일 미기재'}"
                ),
                metadata={
                    "opportunityCode": row["opportunity_code"],
                    "customerName": row["customer_name"],
                    "contractType": row.get("contract_type"),
                    "status": row.get("status"),
                    "maintenanceStartDate": str(row.get("maintenance_start_date") or ""),
                    "maintenanceEndDate": str(row.get("maintenance_end_date") or ""),
                },
            )
        )
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_paid_maintenance_transition_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [
        "핵심 결론: 유상유지보수 전환 신호가 확인된 사업은 다음과 같습니다.",
        "",
    ]
    evidences: list[AnswerEvidence] = []
    for row in rows[:5]:
        note = row.get("next_opportunity_hint") or "유상 유지보수 전환 관련 흔적이 확인됩니다."
        lines.append(
            f"- {row['opportunity_name']} ({row['customer_name']}, {row.get('maintenance_code') or '유지보수코드 미기재'}, "
            f"견적 {row.get('maintenance_quote_code') or '없음'})"
        )
        lines.append(f"  근거: {note}")
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="MAINTENANCE_QUOTE" if row.get("maintenance_quote_code") else "MAINTENANCE",
                sourceId=str(row.get("maintenance_quote_code") or row.get("maintenance_code") or row["opportunity_code"]),
                title=f"{row['opportunity_name']} 유상유지보수 전환",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row['opportunity_name']} / {row['customer_name']} / {row.get('maintenance_code') or '유지보수코드 미기재'} / "
                    f"{row.get('maintenance_quote_code') or '견적 없음'} / {note}"
                ),
                metadata={
                    "opportunityCode": row["opportunity_code"],
                    "customerName": row["customer_name"],
                    "maintenanceCode": row.get("maintenance_code"),
                    "maintenanceQuoteCode": row.get("maintenance_quote_code"),
                    "postSalesCode": row.get("post_sales_code"),
                },
            )
        )
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_product_catalog_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    product_class: str | None,
    name_term: str | None = None,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    evidences: list[AnswerEvidence] = []

    # 특정 모듈명 검색 결과 → 단답형
    if name_term:
        lines: list[str] = [
            f"핵심 결론: '{name_term}' 검색 결과 {len(rows)}개 모듈이 확인됩니다.",
            "",
        ]
        for i, row in enumerate(rows):
            price_str = format_number(row.get("unit_price"), suffix="원") if row.get("unit_price") else "가격 미기재"
            version_suffix = build_row_version_suffix(row)
            lines.append(
                f"- {row.get('product_name') or '미기재'}"
                f" [{row.get('product_class') or ''} / {row.get('product_group') or ''}]"
                f"{version_suffix} : {price_str}"
            )
            evidences.append(
                AnswerEvidence(
                    evidenceType="structured_evidence",
                    sourceType="MODULE",
                    sourceId=str(row.get("id") or i),
                    title=str(row.get("product_name") or name_term),
                    chunkIndex=i,
                    distance=0.0,
                    vectorScore=1.0,
                    keywordScore=1.0,
                    finalScore=1.0,
                    matchedBy=["structured_row"],
                    content=f"{row.get('product_name')} / {row.get('product_class')} / {row.get('product_group')} / {price_str}",
                    metadata={
                        "productClass": row.get("product_class"),
                        "productGroup": row.get("product_group"),
                        "productName": row.get("product_name"),
                        "unitPrice": str(row.get("unit_price")) if row.get("unit_price") is not None else None,
                        "documentSeriesCode": row.get("document_series_code"),
                        "documentVersion": row.get("document_version"),
                        "isLatestVersion": row.get("is_latest_version"),
                    },
                )
            )
        return AnswerResponse(
            query=query,
            answer="\n".join(lines),
            embeddingModel=embedder.config.model_name,
            chatModel="structured-rule-engine",
            excludedSourceTypes=[],
            evidences=evidences[:limit],
        )

    # 제품군/전체 목록 → 그룹핑 표시
    class_label = product_class or "전체"
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        cls = str(row.get("product_class") or "기타")
        grouped.setdefault(cls, []).append(row)

    lines = []
    if product_class:
        lines.append(f"핵심 결론: {class_label} 제품군에는 총 {len(rows)}개 모듈이 있습니다.")
    else:
        lines.append(f"핵심 결론: POLESTAR 제품 카탈로그에는 총 {len(rows)}개 모듈이 있습니다.")
    lines.append("")

    for cls, items in sorted(grouped.items()):
        lines.append(f"[{cls}] — {len(items)}개")
        for item in items[:8]:
            price_str = format_number(item.get("unit_price"), suffix="원") if item.get("unit_price") else "가격 미기재"
            version_suffix = build_row_version_suffix(item)
            lines.append(
                f"  · {item.get('product_name') or '미기재'}"
                f"{version_suffix}"
                f" ({item.get('product_group') or '그룹 미기재'}"
                f" / {item.get('license_standard') or ''} {item.get('license_unit') or ''}"
                f" / {price_str})"
            )
        if len(items) > 8:
            lines.append(f"  … 외 {len(items) - 8}개")
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="MODULE",
                sourceId=cls,
                title=f"{cls} 제품군",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=f"{cls} 제품군: {', '.join(r.get('product_name') or '' for r in items[:5])}",
                metadata={"productClass": cls, "count": len(items)},
            )
        )

    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences[:limit],
    )


def build_module_revenue_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    product_class: str | None,
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    class_label = product_class or "전체"
    lines: list[str] = [
        f"핵심 결론: {class_label} 모듈별 견적 공급 금액 현황입니다.",
        "",
    ]
    evidences: list[AnswerEvidence] = []
    for i, row in enumerate(rows[:10]):
        total_price = row.get("total_supply_price")
        qty = row.get("total_quantity")
        cnt = row.get("quotation_count")
        lines.append(
            f"{i + 1}. {row.get('product_name') or '미기재'} ({row.get('product_class') or ''})"
        )
        lines.append(
            f"   총 공급가: {format_number(total_price, suffix='원')} / 수량: {qty or 0} / 견적 {cnt or 0}건"
        )
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="MODULE",
                sourceId=str(row.get("product_name") or i),
                title=str(row.get("product_name") or "모듈"),
                chunkIndex=i,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row.get('product_name')} / {row.get('product_class')} / "
                    f"공급가 {format_number(total_price, suffix='원')} / {cnt}건"
                ),
                metadata={
                    "productClass": row.get("product_class"),
                    "productName": row.get("product_name"),
                    "totalSupplyPrice": str(total_price) if total_price is not None else None,
                    "quotationCount": cnt,
                },
            )
        )
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences[:limit],
    )


def build_opportunity_list_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [f"핵심 결론: 전체 사업기회는 총 {len(rows)}건입니다.", ""]
    for i, row in enumerate(rows, 1):
        amount = format_number(row.get("expected_amount")) if row.get("expected_amount") else "금액 미기재"
        lines.append(
            f"{i}. [{row.get('opportunity_code') or '-'}] {row.get('opportunity_name') or '미기재'}"
            f" ({row.get('customer_name') or '미기재'} / {row.get('current_status') or '미기재'} / {amount})"
        )
    evidences = build_status_list_evidences(rows=rows[:limit])
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_entity_count_response(
    *,
    query: str,
    entity_type: str,
    count: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    label_map = {
        "opportunity": "사업기회",
        "activity": "영업활동",
        "rfp": "RFP",
        "quotation": "견적서",
        "project": "프로젝트",
        "contract": "계약",
        "maintenance": "유지보수",
        "prb": "PRB",
        "bid": "입찰 결과",
        "proposal": "제안서",
    }
    label = label_map.get(entity_type, entity_type)
    return AnswerResponse(
        query=query,
        answer=f"핵심 결론: 현재 등록된 {label}은 총 {count:,}건입니다.",
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=[],
    )


def build_maintenance_history_response(
    *,
    query: str,
    opportunity_code: str,
    opportunity_name: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    header = f"핵심 결론: {opportunity_name}의 유지보수 이력은 다음과 같습니다."
    lines = [header, ""]
    for row in rows[: min(len(rows), 5)]:
        owners = " / ".join(value for value in [row.get("primary_owner"), row.get("secondary_owner")] if value)
        lines.append(
            f"- {row.get('activity_date')}: {owners or '담당자 미기재'}가 {row.get('activity_type') or '활동'} 수행"
        )
        lines.append(f"  내용: {row.get('activity_content') or '미기재'}")
        lines.append(f"  결과: {row.get('performance') or '미기재'}")
    evidences = build_support_row_evidences(rows=rows[:limit])
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_sales_activity_timeline_response(
    *,
    query: str,
    opportunity_code: str,
    opportunity_name: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    lines = [f"핵심 결론: {opportunity_name}의 최근 영업활동은 다음과 같습니다.", ""]
    for row in rows[:5]:
        lines.append(
            f"- {row.get('activity_at') or '시각 미기재'} / {row.get('activity_type') or '활동'} / {row.get('activity_channel') or '채널 미기재'}"
        )
        lines.append(f"  내용: {row.get('content') or '미기재'}")
        lines.append(f"  고객 관심: {row.get('customer_interest') or '미기재'}")
        lines.append(f"  이슈 및 다음 액션: {row.get('issue') or '미기재'} / {row.get('next_action') or '미기재'}")
    evidences = build_activity_row_evidences(rows=rows[:limit])
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_maintenance_quote_response(
    *,
    query: str,
    snapshot: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    items = snapshot.get("items") or []
    item_lines = []
    for item in items[:3]:
        item_lines.append(
            f"- {item.get('product_name') or item.get('service_item')}: {item.get('service_content') or '미기재'} "
            f"(금액 {format_number(item.get('maintenance_amount'))}, 비고 {item.get('note') or '미기재'})"
        )
    answer = "\n".join(
        [
            f"핵심 결론: {snapshot['opportunity_name']} 유지보수 견적은 총 {format_number(snapshot.get('quote_amount_total'))}입니다.",
            "",
            f"유지보수 기간: {snapshot.get('maintenance_start_date') or '미기재'} ~ {snapshot.get('maintenance_end_date') or '미기재'}",
            f"월 공급가: {format_number(snapshot.get('monthly_supply_amount'))}",
            f"특이사항: {snapshot.get('special_notes') or '미기재'}",
            "",
            "주요 항목:",
            *item_lines,
        ]
    )
    evidences = build_maintenance_quote_evidences(snapshot=snapshot, limit=limit)
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_project_result_highlight_response(
    *,
    query: str,
    row: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    answer = "\n".join(
        [
            f"핵심 결론: 수행이 끝난 사업 중 하나로 {row['opportunity_name']}의 결과보고서에서 {row.get('detail_content') or '미기재'}가 확인됩니다.",
            "",
            f"고객사: {row.get('customer_name') or '미기재'}",
            f"프로젝트 코드: {row.get('project_code') or '미기재'}",
            f"결과보고 코드: {row.get('project_report_code') or '미기재'}",
            f"결과 상태: {row.get('result_status') or '미기재'}",
            f"보고 일자: {row.get('report_date') or '미기재'}",
        ]
    )
    evidences = [
        AnswerEvidence(
            evidenceType="structured_evidence",
            sourceType="PROJECT_RESULT_REPORT",
            sourceId=str(row.get("project_report_code") or row.get("project_code") or row.get("opportunity_code")),
            title=f"{row['opportunity_name']} 결과보고",
            chunkIndex=0,
            distance=0.0,
            vectorScore=1.0,
            keywordScore=1.0,
            finalScore=1.0,
            matchedBy=["structured_row"],
            content=(
                f"{row.get('project_report_code') or '미기재'} / {row.get('result_status') or '미기재'} / "
                f"{row.get('detail_content') or '미기재'}"
            ),
            metadata={"opportunityCode": row.get("opportunity_code")},
        )
    ]
    return AnswerResponse(
        query=query,
        answer=answer,
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences[:limit],
    )


def build_maintenance_activity_rank_response(
    *,
    query: str,
    rows: list[dict[str, Any]],
    limit: int,
    embedder: EmbeddingModel,
    contract_type: str | None = None,
) -> AnswerResponse:
    top = rows[0]
    contract_prefix = f"{contract_type} " if contract_type else ""
    lines = [
        (
            f"핵심 결론: {contract_prefix}유지보수 활동 건수 기준으로 가장 많은 사업은 "
            f"{top['opportunity_name']}입니다."
        ),
        "",
    ]
    for row in rows:
        lines.append(
            f"- {row['opportunity_name']} ({row['customer_name']}): 활동 {row['activity_count']}건, "
            f"총 {format_number(row.get('activity_hours'), suffix='시간')}, 최근 활동 {row.get('latest_activity_date') or '미기재'}"
        )
    evidences = build_rank_row_evidences(rows=rows[:limit], source_type="MAINTENANCE")
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_won_summary_response(
    *,
    query: str,
    intent: StructuredQueryIntent,
    summary: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    won_count = int(summary["won_count"])
    total_contract_amount = format_number(summary["total_contract_amount"], suffix="원")
    top_rows = summary["top_rows"][:3]

    lines = [
        f"핵심 결론: {intent.time_label or '지정 기간'} 기준 수주 실적은 총 {won_count}건입니다.",
        "",
        f"총 계약 금액 합계는 {total_contract_amount}입니다.",
    ]

    if top_rows:
        lines.extend(["", "주요 수주 건:"])
        for row in top_rows:
            lines.append(
                f"- {row['opportunity_name']} ({row['customer_name']}, "
                f"{format_number(row['contract_amount'], suffix='원')}, "
                f"{row.get('contract_date') or '-'} 기준)"
            )

    evidences = build_won_summary_evidences(rows=top_rows[:limit])
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def build_total_metric_response(
    *,
    query: str,
    intent: StructuredQueryIntent,
    summary: dict[str, Any],
    limit: int,
    embedder: EmbeddingModel,
) -> AnswerResponse:
    total_value = format_number(summary.get("total_value"), suffix=metric_suffix(intent.metric_key))
    row_count = int(summary.get("row_count") or 0)
    top_rows = list(summary.get("top_rows") or [])[:3]

    lines = [
        f"핵심 결론: 현재 기준 {intent.metric_label}은 {total_value}입니다.",
        "",
        f"근거: 정형 데이터 {row_count}건을 합산한 결과입니다.",
    ]
    if top_rows:
        lines.extend(["", "상위 기여 사업:"])
        for row in top_rows:
            lines.append(
                f"- {row['opportunity_name']} ({row['customer_name']}, "
                f"{format_number(row.get('metric_value'), suffix=metric_suffix(intent.metric_key))})"
            )

    evidences = build_metric_rank_evidences(rows=top_rows[:limit], intent=intent, limit=min(limit, len(top_rows)))
    return AnswerResponse(
        query=query,
        answer="\n".join(lines),
        embeddingModel=embedder.config.model_name,
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=evidences,
    )


def fetch_structured_evidences(
    *,
    query: str,
    source_types: list[str],
    limit: int,
    start_at: str | None,
    end_at: str | None,
    embedder: EmbeddingModel,
) -> list[AnswerEvidence]:
    response = search_knowledge(
        query=query,
        limit=limit,
        source_types=source_types,
        attachment_session_id=None,
        start_at=start_at,
        end_at=end_at,
        embedder=embedder,
    )
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
        for result in response.results
    ]


def summarize_text(value: Any, *, max_length: int = 140) -> str | None:
    text = " ".join(str(value or "").split())
    if not text:
        return None
    return text if len(text) <= max_length else f"{text[: max_length - 1].rstrip()}…"


def extract_project_risk_points(rows: list[dict[str, Any]]) -> list[str]:
    points: list[str] = []
    seen: set[str] = set()
    for row in rows:
        summary = summarize_text(row.get("detail_content"))
        if not summary or summary in seen:
            continue
        seen.add(summary)
        report_date = row.get("report_date") or "미기재"
        points.append(f"{report_date} 결과보고: {summary}")
    return points


def extract_maintenance_risk_points(rows: list[dict[str, Any]]) -> list[str]:
    points: list[str] = []
    seen: set[str] = set()
    for row in rows:
        activity = summarize_text(row.get("activity_content"))
        performance = summarize_text(row.get("performance"))
        summary = activity or performance
        if not summary:
            continue
        if performance and performance != activity:
            summary = f"{activity or '활동 내용 미기재'} / 조치 결과: {performance}"
        if summary in seen:
            continue
        seen.add(summary)
        activity_date = row.get("activity_date") or "미기재"
        points.append(f"{activity_date} {row.get('activity_type') or '지원'}: {summary}")
    return points


def build_project_progress_evidences(*, rows: list[dict[str, Any]]) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows:
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="PROJECT_RESULT_REPORT",
                sourceId=str(row.get("project_report_code") or row.get("project_code") or row.get("opportunity_code")),
                title=f"{row.get('opportunity_name') or '사업'} 프로젝트 진행 근거",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row.get('report_date') or '미기재'} / {row.get('result_status') or row.get('project_status') or '미기재'} / "
                    f"{row.get('detail_content') or '미기재'}"
                ),
                metadata={
                    "opportunityCode": row.get("opportunity_code"),
                    "projectCode": row.get("project_code"),
                },
            )
        )
    return evidences


def build_entity_risk_evidences(
    *,
    prb_snapshot: dict[str, Any] | None,
    project_rows: list[dict[str, Any]],
    maintenance_rows: list[dict[str, Any]],
    limit: int,
) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    if prb_snapshot is not None:
        evidences.extend(
            build_snapshot_evidences(
                prb_snapshot,
                [
                    ("PRB", "prb_code", "opportunity_name", ["risk_factors", "risk_review", "final_opinion"]),
                    ("PRB_RESULT", "prb_result_code", "opportunity_name", ["decision_status", "risk_review", "final_opinion"]),
                ],
                limit=2,
            )
        )
    evidences.extend(build_project_progress_evidences(rows=project_rows[:2]))
    evidences.extend(build_support_row_evidences(rows=maintenance_rows[:2]))
    return evidences[: max(limit, 3)]


def build_snapshot_evidences(
    snapshot: dict[str, Any],
    mappings: list[tuple[str, str, str, list[str]]],
    *,
    limit: int,
) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for source_type, id_key, title_key, detail_keys in mappings:
        source_id = snapshot.get(id_key)
        if not source_id:
            continue
        title = str(snapshot.get(title_key) or source_id)
        details = []
        for key in detail_keys:
            value = snapshot.get(key)
            if value in (None, "", []):
                continue
            details.append(f"{key}: {value}")
        content = "\n".join(
            [
                f"sourceType: {source_type}",
                f"sourceId: {source_id}",
                f"title: {title}",
                *details,
            ]
        )
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType=source_type,
                sourceId=str(source_id),
                title=title,
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_snapshot"],
                content=content,
                metadata={"snapshotBased": True, "idKey": id_key},
            )
        )
        if len(evidences) >= limit:
            break
    return evidences


def build_snapshot_version_lines(snapshot: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    series_code = snapshot.get("document_series_code")
    version = snapshot.get("document_version")
    is_latest = snapshot.get("is_latest_version")
    previous_version_id = snapshot.get("previous_version_id")

    if series_code not in (None, ""):
        lines.append(f"문서 계열 코드: {series_code}")
    if version not in (None, ""):
        lines.append(f"문서 버전: {version}")
    if is_latest is not None:
        lines.append(f"최신 버전 여부: {'예' if bool(is_latest) else '아니오'}")
    if previous_version_id not in (None, ""):
        lines.append(f"이전 버전 참조: {previous_version_id}")
    return lines


def extract_rfp_requirement_rows(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    rows = snapshot.get("requirement_rows") or []
    return [row for row in rows if isinstance(row, dict)]


def format_effort_value(value: Any) -> str:
    if value in (None, "", 0, 0.0, Decimal("0")):
        return "0M/D"
    try:
        number = Decimal(str(value))
    except Exception:
        return f"{value}M/D"
    normalized = number.normalize()
    text = format(normalized, "f").rstrip("0").rstrip(".")
    return f"{text or '0'}M/D"


def format_datetime(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.astimezone(KST).strftime("%Y-%m-%d %H:%M")
    return str(value)


_RFP_ROW_QUERY_STOPWORDS = {
    "rfp", "분석", "검토", "검토내용", "검토내용과", "지원", "지원여부", "여부", "공수", "내용",
    "알려줘", "보여줘", "요약", "요약해줘", "에서", "관련", "어떻게", "되니", "것", "들", "중",
    "사업", "사업의", "사업을", "사항", "세부", "조회", "정리", "지금", "현재",
}


def extract_rfp_focus_terms(query: str) -> list[str]:
    tokens = re.findall(r"[A-Za-z0-9가-힣+#./-]+", query)
    terms: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        lowered = token.lower()
        normalized = lowered.strip()
        if not normalized or normalized in _RFP_ROW_QUERY_STOPWORDS:
            continue
        if len(normalized) == 1 and not normalized.isupper():
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        terms.append(normalized)
    return terms


def compute_rfp_row_match_score(*, row: dict[str, Any], terms: list[str]) -> int:
    haystack_title = " ".join(
        str(row.get(key) or "") for key in ("requirementTitle", "category", "requirementCode")
    ).lower()
    haystack_detail = " ".join(
        str(row.get(key) or "") for key in ("requirementContent", "reviewNote", "supportStatus")
    ).lower()
    score = 0
    for term in terms:
        if term and term in haystack_title:
            score += 3
        elif term and term in haystack_detail:
            score += 1
    return score


def select_matching_rfp_rows(*, query: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    terms = extract_rfp_focus_terms(query)
    if not rows or not terms:
        return []
    scored: list[tuple[int, dict[str, Any]]] = []
    for row in rows:
        score = compute_rfp_row_match_score(row=row, terms=terms)
        if score > 0:
            scored.append((score, row))
    scored.sort(
        key=lambda item: (
            -item[0],
            str(item[1].get("requirementTitle") or item[1].get("category") or ""),
        )
    )
    return [row for _, row in scored[:3]]


def is_rfp_requirement_detail_query(query: str) -> bool:
    lowered = query.lower()
    return any(
        keyword in lowered
        for keyword in ["검토", "검토 내용", "검토내용", "지원 여부", "지원여부", "공수", "m/d", "effort"]
    )


def build_rfp_requirement_row_evidences(
    *,
    snapshot: dict[str, Any],
    rows: list[dict[str, Any]],
    offset: int = 0,
) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    source_id = str(snapshot.get("rfp_analysis_code") or snapshot.get("opportunity_code") or "rfp-analysis")
    title = f"{snapshot.get('opportunity_name') or source_id} RFP 분석 요구사항"
    for index, row in enumerate(rows):
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="RFP_ANALYSIS",
                sourceId=source_id,
                title=title,
                chunkIndex=offset + index,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row.get('requirementCode') or '-'} / "
                    f"{row.get('requirementTitle') or row.get('category') or '요구사항'} / "
                    f"지원 여부 {row.get('supportStatus') or '미기재'} / "
                    f"공수 {format_effort_value(row.get('effort'))} / "
                    f"{row.get('reviewNote') or row.get('requirementContent') or '미기재'}"
                ),
                metadata={
                    "opportunityCode": snapshot.get("opportunity_code"),
                    "requirementCode": row.get("requirementCode"),
                    "supportStatus": row.get("supportStatus"),
                },
            )
        )
    return evidences


def build_row_version_suffix(row: dict[str, Any]) -> str:
    version = row.get("document_version")
    is_latest = row.get("is_latest_version")
    details: list[str] = []
    if version not in (None, ""):
        details.append(f"v{version}")
    if is_latest is not None:
        details.append("최신" if bool(is_latest) else "이전")
    if not details:
        return ""
    return f" [{', '.join(details)}]"


def build_support_row_evidences(*, rows: list[dict[str, Any]]) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows:
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="CUSTOMER_SUPPORT",
                sourceId=str(row.get("support_code") or row.get("opportunity_code")),
                title=f"{row['opportunity_name']} 유지보수 이력",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row.get('activity_date') or '미기재'} / {row.get('activity_type') or '활동'} / "
                    f"{row.get('primary_owner') or '담당자 미기재'} / {row.get('activity_content') or '미기재'} / "
                    f"{row.get('performance') or '미기재'}"
                ),
                metadata={
                    "opportunityCode": row.get("opportunity_code"),
                    "maintenanceCode": row.get("maintenance_code"),
                },
            )
        )
    return evidences


def filter_support_issue_rows(rows: list[dict[str, Any]], *, query: str) -> list[dict[str, Any]]:
    keywords = ["긴급", "장애", "복구", "대응", "점검", "조치"]
    query_keywords = [keyword for keyword in keywords if keyword in query]
    selected: list[dict[str, Any]] = []
    for row in rows:
        haystack = " ".join(
            str(row.get(key) or "")
            for key in ("activity_type", "activity_content", "performance")
        )
        if any(keyword in haystack for keyword in query_keywords or keywords):
            selected.append(row)
    return selected


def build_activity_row_evidences(*, rows: list[dict[str, Any]]) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for index, row in enumerate(rows):
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="SALES_ACTIVITY",
                sourceId=str(row.get("opportunity_code")),
                title=f"{row['opportunity_name']} 영업활동 #{index + 1}",
                chunkIndex=index,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row.get('activity_at') or '미기재'} / {row.get('activity_type') or '활동'} / "
                    f"{row.get('activity_channel') or '채널 미기재'} / {row.get('content') or '미기재'} / "
                    f"{row.get('next_action') or '미기재'}"
                ),
                metadata={"opportunityCode": row.get("opportunity_code")},
            )
        )
    return evidences


def build_maintenance_quote_evidences(*, snapshot: dict[str, Any], limit: int) -> list[AnswerEvidence]:
    evidences = build_snapshot_evidences(
        snapshot,
        [
            ("MAINTENANCE_QUOTE", "maintenance_quote_code", "opportunity_name", ["quote_amount_total", "monthly_supply_amount", "special_notes"]),
            ("MAINTENANCE", "maintenance_code", "opportunity_name", ["maintenance_start_date", "maintenance_end_date"]),
        ],
        limit=max(2, min(limit, 3)),
    )
    items = snapshot.get("items") or []
    for index, item in enumerate(items[: max(0, limit - len(evidences))]):
        evidences.append(
            AnswerEvidence(
                evidenceType="structured_evidence",
                sourceType="MAINTENANCE_QUOTE",
                sourceId=str(snapshot.get("maintenance_quote_code") or snapshot["opportunity_code"]),
                title=f"{snapshot['opportunity_name']} 유지보수 견적 항목 #{index + 1}",
                chunkIndex=index,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{item.get('product_name') or item.get('service_item') or '항목 미기재'} / "
                    f"{item.get('service_content') or '미기재'} / "
                    f"{format_number(item.get('maintenance_amount'))} / "
                    f"{item.get('note') or '미기재'}"
                ),
                metadata={"opportunityCode": snapshot["opportunity_code"]},
            )
        )
    return evidences


def build_rank_row_evidences(*, rows: list[dict[str, Any]], source_type: str) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows:
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType=source_type,
                sourceId=str(row.get("maintenance_code") or row.get("opportunity_code")),
                title=f"{row['opportunity_name']} 집계 근거",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row['opportunity_name']} / {row['customer_name']} / 활동 {row.get('activity_count')}건 / "
                    f"총 {row.get('activity_hours')}시간 / 최근 {row.get('latest_activity_date') or '미기재'}"
                ),
                metadata={"opportunityCode": row.get("opportunity_code")},
            )
        )
    return evidences


def build_won_summary_evidences(*, rows: list[dict[str, Any]]) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows:
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType="WON",
                sourceId=str(row.get("opportunity_code") or row.get("won_report_code")),
                title=f"{row['opportunity_name']} 수주 실적",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row['opportunity_name']} / {row['customer_name']} / "
                    f"{format_number(row.get('contract_amount'))} / {row.get('contract_date') or '미기재'}"
                ),
                metadata={"opportunityCode": row.get("opportunity_code")},
            )
        )
    return evidences


def build_difficult_win_evidences(*, rows: list[dict[str, Any]], limit: int) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows[:limit]:
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType="PRB",
                sourceId=str(row.get("reference_code") or row.get("opportunity_code")),
                title=f"{row['opportunity_name']} 난이도 근거",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row['opportunity_name']} / 예상 수주율 {format_number(row.get('expected_win_rate'), suffix='%')} / "
                    f"리스크 {row.get('risk_factors') or '미기재'} / 경쟁 {row.get('competitor_summary') or row.get('competitor_status') or '미기재'}"
                ),
                metadata={"opportunityCode": row.get("opportunity_code")},
            )
        )
    return evidences


def build_metric_rank_evidences(*, rows: list[dict[str, Any]], intent: StructuredQueryIntent, limit: int) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows[:limit]:
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType=normalize_structured_source_type(row.get("reference_code")),
                sourceId=str(row.get("reference_code") or row.get("opportunity_code")),
                title=f"{row['opportunity_name']} {intent.metric_label or '지표'} 근거",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row['opportunity_name']} / {row['customer_name']} / "
                    f"{intent.metric_label or '지표'} {format_number(row.get('metric_value'), suffix=metric_suffix(intent.metric_key))}"
                ),
                metadata={"opportunityCode": row.get("opportunity_code")},
            )
        )
    return evidences


def build_document_recency_evidences(*, rows: list[dict[str, Any]], document_scope: str | None) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows:
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType=document_scope or str(row.get("source_type") or "DOCUMENT"),
                sourceId=str(row.get("reference_code") or row.get("opportunity_code") or ""),
                title=str(row.get("reference_code") or row.get("opportunity_name") or "문서"),
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row", "document_recency"],
                content=build_document_recency_detail(row=row, document_scope=document_scope, basis_label="문서 기준 일자") or str(row.get("opportunity_name") or "문서"),
                metadata={
                    "opportunityCode": row.get("opportunity_code"),
                    "opportunityName": row.get("opportunity_name"),
                    "customerName": row.get("customer_name"),
                },
            )
        )
    return evidences


def normalize_structured_source_type(reference_code: Any) -> str:
    prefix = str(reference_code or "").split("-")[0].upper()
    mapping = {
        "WR": "ORDER_REPORT",
        "CTR": "CONTRACT",
        "PRJ": "PROJECT",
        "PJR": "PROJECT_RESULT_REPORT",
        "MNT": "MAINTENANCE",
        "MQ": "MAINTENANCE_QUOTE",
        "PRB": "PRB",
        "RFP": "RFP",
        "OPP": "PROJECT_OPPORTUNITY",
    }
    return mapping.get(prefix, "PROJECT_OPPORTUNITY")


def build_status_list_evidences(*, rows: list[dict[str, Any]]) -> list[AnswerEvidence]:
    evidences: list[AnswerEvidence] = []
    for row in rows:
        evidences.append(
            AnswerEvidence(
                evidenceType="derived_summary_evidence",
                sourceType="PROJECT_OPPORTUNITY",
                sourceId=str(row["opportunity_code"]),
                title=f"{row['opportunity_name']} 상태 근거",
                chunkIndex=0,
                distance=0.0,
                vectorScore=1.0,
                keywordScore=1.0,
                finalScore=1.0,
                matchedBy=["structured_row"],
                content=(
                    f"{row['opportunity_code']} / {row['customer_name']} / "
                    f"{row.get('current_status') or '미기재'} / 예상 사업비 {format_number(row.get('expected_amount'))}"
                ),
                metadata={"opportunityCode": row.get("opportunity_code")},
            )
        )
    return evidences


def format_number(value: Any, suffix: str = "원") -> str:
    if value is None:
        return "미기재"
    if isinstance(value, Decimal):
        normalized = value.quantize(Decimal("1")) if value == value.to_integral() else value.normalize()
        text = f"{normalized:,}"
    elif isinstance(value, float):
        text = f"{value:,.2f}".rstrip("0").rstrip(".")
    elif isinstance(value, int):
        text = f"{value:,}"
    else:
        text = str(value)

    if suffix and text != "미기재":
        return f"{text}{suffix}"
    return text


def format_timestamp(value: Any) -> str:
    if value is None:
        return "미기재"
    if isinstance(value, datetime):
        return value.astimezone(KST).strftime("%Y-%m-%d %H:%M")
    return str(value)


def metric_suffix(metric_key: str | None) -> str:
    spec = get_metric_spec(metric_key)
    if spec is not None:
        return spec.suffix
    if metric_key in {"estimated_profit_rate", "expected_win_rate"}:
        return "%"
    if metric_key in {"estimated_profit", "estimated_revenue", "expected_amount", "contract_amount"}:
        return "원"
    return ""


def metric_rank_descriptor(metric_key: str | None, sort_direction: str) -> str:
    descending = sort_direction == "desc"
    if metric_key == "activity_recency_gap_days":
        return "긴" if descending else "짧은"
    return "높은" if descending else "낮은"


def document_scope_label(document_scope: str | None) -> str:
    mapping = {
        "RFP": "RFP",
        "RFP_ANALYSIS": "RFP 분석",
        "PRB": "PRB",
        "PRB_RESULT": "PRB 결과",
        "PROPOSAL": "제안서",
        "WON": "수주",
        "LOST": "실주",
        "ORDER_REPORT": "수주보고서",
        "CONTRACT": "계약서",
        "PROJECT_RESULT_REPORT": "결과보고서",
        "MAINTENANCE_QUOTE": "유지보수 견적서",
    }
    return mapping.get(document_scope or "", document_scope or "문서")


def resolve_primary_opportunity_with_fallback(
    *,
    query: str,
    normalization: QueryNormalization,
    exact_codes: list[str],
) -> dict[str, Any] | None:
    entity = resolve_primary_opportunity(
        query_terms=normalization.scope_terms or normalization.entity_terms,
        exact_codes=exact_codes,
    )
    if entity is not None:
        return entity

    query_lower = query.lower()
    candidates = fetch_opportunity_resolution_candidates(limit=300)
    scored: list[tuple[int, dict[str, Any]]] = []
    for row in candidates:
        score = score_opportunity_candidate_against_query(query_lower=query_lower, row=row)
        if score > 0:
            scored.append((score, row))
    scored.sort(key=lambda item: (-item[0], str(item[1].get("opportunity_code") or "")))
    if not scored:
        return None
    if len(scored) == 1 or scored[0][0] >= scored[1][0] + 3:
        return scored[0][1]
    return None


def score_opportunity_candidate_against_query(*, query_lower: str, row: dict[str, Any]) -> int:
    score = 0
    customer_name = str(row.get("customer_name") or "").strip().lower()
    opportunity_name = str(row.get("opportunity_name") or "").strip().lower()
    opportunity_code = str(row.get("opportunity_code") or "").strip().lower()
    if customer_name and customer_name in query_lower:
        score += 12
    if opportunity_name and opportunity_name in query_lower:
        score += 16
    if opportunity_code and opportunity_code in query_lower:
        score += 20

    for token in extract_candidate_resolution_tokens(customer_name):
        if token and token in query_lower:
            score += 3
    for token in extract_candidate_resolution_tokens(opportunity_name):
        if token and token in query_lower:
            score += 2
    return score


def extract_candidate_resolution_tokens(value: str) -> list[str]:
    tokens = re.findall(r"[A-Za-z0-9가-힣]+", value)
    results: list[str] = []
    for token in tokens:
        normalized = token.strip().lower()
        if len(normalized) < 2:
            continue
        if normalized in _RFP_ROW_QUERY_STOPWORDS:
            continue
        results.append(normalized)
    return results


def is_status_query(normalized_query: str) -> bool:
    return any(keyword in normalized_query for keyword in ["상태", "현황", "진행", "현재", "단계", "까지 갔"])


def is_opportunity_identity_query(normalized_query: str) -> bool:
    return any(keyword in normalized_query for keyword in ["어떤 고객사 사업", "어떤 사업", "무슨 사업", "사업이야", "사업이 뭐야"])


def is_entity_risk_focus_query(normalized_query: str, graph_state: Any | None) -> bool:
    if "리스크" not in normalized_query and "위험" not in normalized_query and "이슈" not in normalized_query:
        return False
    focus = getattr(graph_state, "focus", None) if graph_state is not None else None
    time_scope = getattr(graph_state, "timeScope", None) if graph_state is not None else None
    answer_shape = getattr(graph_state, "answerShape", None) if graph_state is not None else None
    if focus == "RISK" or answer_shape == "risk_focused":
        return True
    return time_scope == "EXECUTION_PROGRESS"


def is_prb_query(normalized_query: str) -> bool:
    return any(
        keyword in normalized_query
        for keyword in [
            "prb",
            "예상 수주율",
            "수주율",
            "추정 영업이익",
            "추정 이익률",
            "영업 의견",
            "심의",
            "리스크",
        ]
    )


def is_rfp_query(normalized_query: str) -> bool:
    return any(
        keyword in normalized_query
        for keyword in [
            "rfp",
            "요구사항",
            "보안 요구",
            "보안요건",
            "제출 마감",
            "사업 범위",
            "발주",
            "검토내용",
            "검토 내용",
            "지원 여부",
            "지원여부",
            "공수",
        ]
    )


def is_high_risk_query(normalized_query: str) -> bool:
    return "리스크" in normalized_query and any(keyword in normalized_query for keyword in ["높", "큰", "심한", "많"])


def is_workflow_status_query(normalized_query: str) -> bool:
    workflow_keywords = ["결재", "승인", "반려", "심의", "접수", "활동요청", "활동 요청", "workflow"]
    return any(keyword in normalized_query for keyword in workflow_keywords)


def resolve_requested_workflow_stage(query: str) -> str | None:
    normalized_query = query.lower()
    if "활동요청" in normalized_query or "활동 요청" in normalized_query or "접수" in normalized_query:
        return "activity_request"
    if "prb" in normalized_query or "심의" in normalized_query:
        return "prb_decision"
    if "수주보고" in normalized_query:
        return "won_report_approval"
    if "계약" in normalized_query:
        return "contract_execution"
    return None


def is_bid_loss_reason_query(normalized_query: str) -> bool:
    return any(keyword in normalized_query for keyword in ["실주", "패배", "탈락", "승패", "실주 사유", "패인", "원인"])


def is_customer_decision_query(normalized_query: str) -> bool:
    return "의사결정" in normalized_query or "결재 라인" in normalized_query or "결정 구조" in normalized_query


def is_evidence_inventory_query(normalized_query: str) -> bool:
    return "근거 문서" in normalized_query or ("문서" in normalized_query and any(keyword in normalized_query for keyword in ["종류", "어떤", "무슨"]))


def is_project_result_highlight_query(normalized_query: str) -> bool:
    return any(keyword in normalized_query for keyword in ["결과보고", "완료 사업", "수행이 끝난", "의미있는 결과"])


def is_maintenance_history_query(normalized_query: str, normalization: QueryNormalization) -> bool:
    if normalization.target_hint != "maintenance":
        return False
    return normalization.has_timeline_intent or any(
        keyword in normalized_query
        for keyword in ["누가", "언제", "이력", "조치", "지원", "긴급", "장애", "대응", "복구"]
    )


def is_sales_activity_timeline_query(normalized_query: str, normalization: QueryNormalization) -> bool:
    if normalization.target_hint != "activity":
        return False
    return any(keyword in normalized_query for keyword in ["최근", "활동", "순서", "이력", "타임라인", "뭐였"])


def is_maintenance_status_query(normalized_query: str, normalization: QueryNormalization) -> bool:
    if normalization.target_hint != "maintenance":
        return False
    return any(keyword in normalized_query for keyword in ["상태", "현황", "진행", "지금", "까지 갔"])


def is_maintenance_quote_query(normalized_query: str) -> bool:
    return "유지보수" in normalized_query and any(
        keyword in normalized_query for keyword in ["견적", "견적서", "정기점검", "긴급", "월", "분기"]
    )


def is_contract_maintenance_query(normalized_query: str) -> bool:
    return "계약" in normalized_query and "유지보수" in normalized_query


def is_project_maintenance_summary_query(normalized_query: str) -> bool:
    if "유지보수" not in normalized_query:
        return False
    has_project_context = any(keyword in normalized_query for keyword in ["프로젝트", "결과", "결과보고", "수행"])
    has_summary_intent = any(keyword in normalized_query for keyword in ["요약", "상황", "현황", "정리"])
    return has_project_context and has_summary_intent


def is_support_issue_query(normalized_query: str, normalization: QueryNormalization) -> bool:
    issue_keywords = ["긴급", "장애", "복구", "대응", "조치 결과", "조치", "지원 내용"]
    if not any(keyword in normalized_query for keyword in issue_keywords):
        return False
    if normalization.target_hint == "maintenance":
        return True
    return True


def is_generic_maintenance_quote_query(normalized_query: str) -> bool:
    return is_maintenance_quote_query(normalized_query)


def is_maintenance_activity_rank_query(normalized_query: str) -> bool:
    if "유지보수" not in normalized_query:
        return False
    has_rank = any(keyword in normalized_query for keyword in ["가장", "제일", "최고", "상위", "많"])
    return has_rank and any(keyword in normalized_query for keyword in ["활동", "지원", "점검", "조치"])


def is_warranty_maintenance_list_query(normalized_query: str) -> bool:
    return "무상유지보수" in normalized_query and any(
        keyword in normalized_query for keyword in ["목록", "사업", "사업들", "알려줘", "보여줘", "있어"]
    )


def is_paid_maintenance_transition_query(normalized_query: str) -> bool:
    compact = normalized_query.replace(" ", "")
    return ("유상유지보수" in compact or ("유상" in normalized_query and "유지보수" in normalized_query)) and any(
        keyword in normalized_query for keyword in ["전환", "사업", "사업들", "있어", "알려줘", "보여줘"]
    )


_PRODUCT_CATALOG_STOPWORDS = {
    "알려줘", "알려", "줘", "보여줘", "보여", "의", "이", "가", "은", "는", "을", "를",
    "에", "에서", "로", "으로", "과", "와", "이랑", "랑", "이나", "나", "단가", "가격",
    "정가", "얼마", "모듈", "제품", "솔루션", "목록", "라인업", "카탈로그", "제품군",
    "제품목록", "모듈목록", "뭐야", "뭐", "있어", "있나", "어때", "알고싶어",
}
_PRODUCT_CLASS_KEYWORDS = {
    "EMS", "ITSM", "ITAM", "CLOUD", "BSM", "RCA", "DCA", "E2E",
    "DASHBOARD", "DATACENTER", "SUPPORTING_TOOLS", "SUPPORTING", "POLESTAR",
}


def is_opportunity_list_query(normalized_query: str) -> bool:
    has_opp = any(kw in normalized_query for kw in ["사업기회", "사업 기회"])
    has_list = any(kw in normalized_query for kw in ["전체", "모든", "모두", "전부", "목록", "리스트", "다 보여", "다 알려", "다 조회"])
    return has_opp and has_list


_COUNT_ENTITY_MAP: dict[str, str] = {
    "사업기회": "opportunity",
    "사업 기회": "opportunity",
    "영업활동": "activity",
    "영업 활동": "activity",
    "활동": "activity",
    "rfp": "rfp",
    "견적": "quotation",
    "프로젝트": "project",
    "계약": "contract",
    "유지보수": "maintenance",
    "prb": "prb",
    "입찰": "bid",
    "제안서": "proposal",
}


def is_entity_count_query(normalized_query: str) -> bool:
    has_count_kw = any(kw in normalized_query for kw in ["몇 개", "몇개", "몇 건", "몇건", "몇가지", "몇 가지", "갯수", "개수", "총 수", "총수", "총 건수", "건수"])
    has_entity_kw = any(kw in normalized_query.lower() for kw in _COUNT_ENTITY_MAP)
    return has_count_kw and has_entity_kw


def extract_count_entity_type(normalized_query: str) -> str | None:
    lower = normalized_query.lower()
    for kw, entity in _COUNT_ENTITY_MAP.items():
        if kw in lower:
            return entity
    return None


def is_product_catalog_query(normalized_query: str) -> bool:
    has_product_keyword = any(
        keyword in normalized_query
        for keyword in ["제품", "모듈", "라인업", "카탈로그", "솔루션 목록", "제품군", "제품 목록", "모듈 목록", "단가", "정가", "가격"]
    )
    has_class_keyword = any(
        keyword in normalized_query.upper()
        for keyword in _PRODUCT_CLASS_KEYWORDS
    )
    has_polestar = "POLESTAR" in normalized_query.upper() or "폴스타" in normalized_query
    return (has_product_keyword and not _is_module_revenue_query(normalized_query)) or has_polestar or (has_class_keyword and has_product_keyword)


def extract_product_name_from_query(normalized_query: str) -> str | None:
    upper = normalized_query.upper()
    if any(cls in upper for cls in _PRODUCT_CLASS_KEYWORDS):
        return None
    tokens = re.split(r"[\s　]+", normalized_query)
    candidates = [
        t for t in tokens
        if len(t) >= 2
        and t.lower() not in _PRODUCT_CATALOG_STOPWORDS
        and t.upper() not in _PRODUCT_CLASS_KEYWORDS
    ]
    return candidates[0] if candidates else None


def is_module_revenue_query(normalized_query: str) -> bool:
    return _is_module_revenue_query(normalized_query)


def _is_module_revenue_query(normalized_query: str) -> bool:
    has_revenue = any(
        keyword in normalized_query for keyword in ["매출", "판매", "수익", "금액", "총액", "얼마", "많이 팔"]
    )
    has_module = any(keyword in normalized_query for keyword in ["모듈", "제품", "솔루션"])
    return has_revenue and has_module


def extract_product_class_from_query(normalized_query: str) -> str | None:
    upper = normalized_query.upper()
    class_map = {
        "EMS": "EMS",
        "ITSM": "ITSM",
        "ITAM": "ITAM",
        "CLOUD": "CLOUD",
        "BSM": "BSM",
        "RCA": "RCA",
        "DCA": "DCA",
        "E2E": "E2E",
        "DASHBOARD": "DASHBOARD",
        "DATACENTER": "DATACENTER",
        "SUPPORTING_TOOLS": "SUPPORTING_TOOLS",
        "SUPPORTING": "SUPPORTING_TOOLS",
    }
    for keyword, cls in class_map.items():
        if keyword in upper:
            return cls
    return None


def extract_business_codes(query: str) -> list[str]:
    return list(dict.fromkeys(match.group(0).upper() for match in BUSINESS_CODE_PATTERN.finditer(query.upper())))


def describe_rfp_origin(value: Any) -> str:
    if value == "activity_received":
        return "영업활동 중 수령"
    if value == "opportunity_registered":
        return "발굴 단계에서 사업기회와 함께 등록"
    return "미기재"


def rank_difficult_wins(rows: list[dict[str, Any]], reason: str) -> list[dict[str, Any]]:
    ranked = []
    for row in rows:
        expected_win_rate = float(row.get("expected_win_rate") or 0.0)
        low_win_score = max(0.0, 70.0 - expected_win_rate)
        risk_texts = [
            row.get("risk_factors"),
            row.get("risk_review"),
            row.get("rfp_risk_factors"),
            row.get("security_requirements"),
            row.get("issue_content"),
        ]
        competition_texts = [
            row.get("competitor_status"),
            row.get("competitor_summary"),
            row.get("competitors"),
            row.get("win_loss_reason"),
        ]

        risk_score = keyword_score(
            risk_texts,
            {
                "리스크": 2.0,
                "보안": 1.8,
                "심의": 1.6,
                "무중단": 1.7,
                "야간": 1.4,
                "지연": 1.5,
                "부족": 1.3,
                "불명확": 1.8,
                "규정": 1.4,
                "검증": 1.2,
                "폐쇄망": 1.8,
                "poC".lower(): 1.6,
                "ot망": 1.5,
            },
        )
        competition_score = keyword_score(
            competition_texts,
            {
                "경쟁": 1.5,
                "경쟁사": 1.8,
                "저가": 2.0,
                "가격": 1.5,
                "기존 유지보수": 1.7,
                "글로벌": 1.3,
                "우위": 1.7,
                "레퍼런스": 1.1,
            },
        )

        if reason == "high_risk":
            primary_score = risk_score
            issue_summary = summarize_issue(risk_texts)
        elif reason == "high_competition":
            primary_score = competition_score
            issue_summary = summarize_issue(competition_texts)
        else:
            primary_score = low_win_score
            issue_summary = summarize_issue(
                [
                    combine_issue_with_metric(
                        metric_text=f"예상 수주율 {format_number(row.get('expected_win_rate'), suffix='%')}",
                        issue_text=row.get("risk_factors"),
                    ),
                    row.get("competitor_summary"),
                    row.get("competitor_status"),
                ]
            )

        difficulty_score = primary_score + (low_win_score * 0.4) + (risk_score * 0.2) + (competition_score * 0.2)
        ranked.append(
            {
                **row,
                "difficulty_score": difficulty_score,
                "issue_summary": issue_summary,
                "risk_score": risk_score,
                "competition_score": competition_score,
                "low_win_score": low_win_score,
            }
        )

    return sorted(
        ranked,
        key=lambda row: (
            -float(row["difficulty_score"]),
            float(row.get("expected_win_rate") or 999.0),
            row["opportunity_name"],
        ),
    )


def keyword_score(texts: list[Any], weights: dict[str, float]) -> float:
    joined = " ".join(str(text or "").lower() for text in texts)
    score = 0.0
    for keyword, weight in weights.items():
        score += joined.count(keyword.lower()) * weight
    return score


def summarize_issue(texts: list[Any]) -> str:
    for text in texts:
        cleaned = str(text or "").strip()
        if cleaned:
            return cleaned
    return "주요 리스크 또는 경쟁 이슈 정보가 명확히 기록되지 않았습니다."


def combine_issue_with_metric(*, metric_text: str, issue_text: Any) -> str:
    cleaned_issue = str(issue_text or "").strip()
    if cleaned_issue:
        return f"{metric_text}, 주요 원인은 {cleaned_issue}"
    return metric_text
