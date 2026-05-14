import os
import sys
from unittest.mock import Mock

os.environ.setdefault("AI_DATABASE_URL", "postgresql://orbis_ai:orbis_ai@127.0.0.1:5432/orbis_db")
os.environ.setdefault("POSTGRES_HOST", "127.0.0.1")
os.environ.setdefault("POSTGRES_USER", "orbis")
os.environ.setdefault("POSTGRES_PASSWORD", "orbis")
os.environ.setdefault("POSTGRES_DB", "orbis_db")

for module_name in [
    "sentence_transformers",
    "torch",
    "transformers",
    "peft",
    "PIL",
    "numpy",
    "rapidfuzz",
    "psycopg",
    "psycopg.rows",
    "langgraph",
    "langgraph.graph",
    "app.core.config",
    "app.embeddings",
    "app.embeddings.model",
    "app.langgraph",
    "app.orchestration",
    "app.orchestration.langgraph_runtime",
    "app.repositories",
    "app.repositories.backend_query_repository",
    "app.services.structured_answer_service",
    "app.services.query_intent_service",
    "app.services.query_normalization_service",
]:
    module = sys.modules.get(module_name)
    if isinstance(module, Mock):
        sys.modules.pop(module_name, None)

from app.langgraph.preflight import build_preflight_graph_state
from app.models.intent import StructuredQueryIntent
from app.schemas.answer import AnswerResponse
from app.services.answer_service import build_ambiguous_reference_response, preserve_or_default_answer_status
from app.services.query_intent_service import parse_structured_query_intent
from app.services.query_normalization_service import normalize_query_context
from app.services.structured_answer_service import filter_opportunity_list_rows_for_query


class FakeEmbedderConfig:
    model_name = "test-embed"


class FakeEmbedder:
    config = FakeEmbedderConfig()


def test_expected_budget_wording_maps_to_expected_amount_rank() -> None:
    query = "예상 예산이 가장 큰 사업 TOP3 알려줘"

    intent = parse_structured_query_intent(query, normalize_query_context(query))

    assert isinstance(intent, StructuredQueryIntent)
    assert intent.intent_type == "metric_rank"
    assert intent.metric_key == "expected_amount"
    assert intent.result_count == 3


def test_contract_amount_wording_maps_to_contract_rank() -> None:
    query = "계약 금액이 가장 큰 계약 알려줘"

    intent = parse_structured_query_intent(query, normalize_query_context(query))

    assert isinstance(intent, StructuredQueryIntent)
    assert intent.intent_type == "metric_rank"
    assert intent.metric_key == "contract_amount"


def test_public_opportunity_list_filters_private_customers() -> None:
    rows = [
        {"opportunity_code": "A", "customer_name": "국민은행", "customer_group": "민간"},
        {"opportunity_code": "B", "customer_name": "한국도로공사", "customer_group": "공공"},
        {"opportunity_code": "C", "customer_name": "롯데카드", "customer_group": "민간"},
        {"opportunity_code": "D", "customer_name": "한국남동발전", "customer_group": "공공"},
    ]

    filtered = filter_opportunity_list_rows_for_query(query="공공 고객 사업기회 목록 보여줘", rows=rows)

    assert [row["opportunity_code"] for row in filtered] == ["B", "D"]


def test_attachment_related_question_requires_attachment_session() -> None:
    graph_state = build_preflight_graph_state(
        query="첨부한 문서와 관련된 사업 알려줘",
        history=[],
        start_at=None,
        end_at=None,
        attachment_session_id=None,
    )

    assert graph_state.clarification.needed is True
    assert graph_state.missingRequiredSlots == ["attachment_session"]


def test_followup_reference_without_history_is_clarification() -> None:
    response = build_ambiguous_reference_response(
        query="그 사업 다음 활동 알려줘",
        history=[],
        embedder=FakeEmbedder(),
    )

    assert response is not None
    assert response.answerStatus == "clarification"
    assert not response.evidences


def test_graph_runtime_preserves_insufficient_evidence_status() -> None:
    response = AnswerResponse(
        query="리스크 큰 후보",
        answer="조건에 맞는 정형 데이터가 없어 답변을 구성하지 못했습니다.",
        answerStatus="insufficient_evidence",
        embeddingModel="test-embed",
        chatModel="structured-rule-engine",
        excludedSourceTypes=[],
        evidences=[],
    )

    preserve_or_default_answer_status(response)

    assert response.answerStatus == "insufficient_evidence"
