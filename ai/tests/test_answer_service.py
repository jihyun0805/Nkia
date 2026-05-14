"""
answer_service.py 핵심 함수에 대한 pytest 테스트.

외부 의존성(app.core.config, DB, LLM, langgraph 등)은 sys.modules 패치를 통해
임포트 시점에 모킹하여 실제 인프라 없이 실행 가능하게 합니다.

패치 전략:
  - 서드파티 패키지(langgraph, sentence_transformers, psycopg 등): sys.modules 에 mock 등록
  - 앱 내부 모듈 중 외부 인프라에 의존하는 것들:
      app.core.config, app.embeddings.model, app.llm.gms_client,
      app.orchestration.*, app.repositories.backend_query_repository
      → sys.modules 에 mock 등록
  - 순수 pydantic/dataclass 모델(app.models.*, app.schemas.*):
      실제 모듈을 임포트 (mock 불필요)
"""

import sys
from types import ModuleType
from unittest.mock import MagicMock

# ---------------------------------------------------------------------------
# 1. 서드파티 패키지 mock  (임포트 체인에서 가장 먼저 처리)
# ---------------------------------------------------------------------------

def _stub(name: str) -> MagicMock:
    m = MagicMock(spec=ModuleType(name))
    m.__name__ = name
    return m


def _register(*names: str) -> None:
    """부모-자식 계층을 포함하여 모든 세그먼트를 sys.modules 에 등록합니다."""
    for full_name in names:
        parts = full_name.split(".")
        for i in range(1, len(parts) + 1):
            key = ".".join(parts[:i])
            if key not in sys.modules:
                sys.modules[key] = _stub(key)


# 서드파티 라이브러리 전체를 stub 으로 처리
_register(
    "sentence_transformers",
    "psycopg",
    "psycopg.rows",
    "psycopg_pool",
    "langgraph",
    "langgraph.graph",
    "langgraph.checkpoint",
    "langgraph.checkpoint.postgres",
    "langgraph.checkpoint.postgres.aio",
    "paddleocr",
    "paddlepaddle",
    "torch",
    "transformers",
    "peft",
    "PIL",
    "numpy",
    "rapidfuzz",
    "prometheus_fastapi_instrumentator",
)

# ---------------------------------------------------------------------------
# 2. 앱 내부 모듈 중 외부 인프라에 의존하는 것들을 mock
# ---------------------------------------------------------------------------

# app.core.config
_config_mod = _stub("app.core.config")
_config_mod.settings = MagicMock(
    gms_key="fake-key",
    gms_chat_completions_url="http://fake-url",
    gms_chat_model="fake-model",
    gms_timeout_seconds=30,
)
_config_mod.Settings = MagicMock
sys.modules["app.core.config"] = _config_mod

# app.embeddings (sentence_transformers 에 의존)
_embeddings_mod = _stub("app.embeddings")
_embeddings_model_mod = _stub("app.embeddings.model")
_embeddings_model_mod.EmbeddingModel = MagicMock
sys.modules["app.embeddings"] = _embeddings_mod
sys.modules["app.embeddings.model"] = _embeddings_model_mod

# app.llm (GMS HTTP 클라이언트)
_llm_mod = _stub("app.llm")
_gms_client_mod = _stub("app.llm.gms_client")
_gms_client_mod.GmsChatClient = MagicMock
_gms_client_mod.GmsChatConfig = MagicMock
sys.modules["app.llm"] = _llm_mod
sys.modules["app.llm.gms_client"] = _gms_client_mod

# app.orchestration (langgraph 전체에 의존 — mock 으로 단락)
_orch_init_mod = _stub("app.orchestration")
_orch_init_mod.OrbisGraphCallbacks = MagicMock
_orch_init_mod.invoke_orbis_agent_graph = MagicMock(return_value=None)
_orch_runtime_mod = _stub("app.orchestration.langgraph_runtime")
_orch_runtime_mod.invoke_orbis_agent_graph = MagicMock(return_value=None)
sys.modules["app.orchestration"] = _orch_init_mod
sys.modules["app.orchestration.langgraph_runtime"] = _orch_runtime_mod

# app.langgraph (공식 LangGraph 런타임/DB 의존 경로 단락)
_langgraph_mod = _stub("app.langgraph")
_langgraph_mod.evaluate_corrective_retrieval = MagicMock(return_value=None)
_langgraph_mod.build_discovery_execution_plan = MagicMock(return_value=MagicMock(is_empty=True))
_langgraph_mod.StructuredExecutionPlan = MagicMock
_langgraph_mod.StructuredExecutionStep = MagicMock
_langgraph_mod.build_preflight_graph_state = MagicMock()
_langgraph_mod.build_retrieval_execution_plan = MagicMock(return_value=None)
_langgraph_mod.build_structured_execution_plan = MagicMock(return_value=MagicMock(is_empty=True, structured_intent=None))
_langgraph_mod.execute_discovery_execution_plan = MagicMock(return_value=None)
_langgraph_mod.execute_structured_execution_plan = MagicMock(return_value=None)
_langgraph_mod.route_to_response_value = MagicMock(return_value="discovery")
sys.modules["app.langgraph"] = _langgraph_mod

# app.repositories (psycopg DB 에 의존)
_repo_pkg_mod = _stub("app.repositories")
_bqr_mod = _stub("app.repositories.backend_query_repository")
_bqr_mod.resolve_primary_opportunity = MagicMock(return_value=None)
sys.modules["app.repositories"] = _repo_pkg_mod
sys.modules["app.repositories.backend_query_repository"] = _bqr_mod

# app.services.query_normalization_service (다른 서비스에 의존할 수 있으므로 mock)
_qns_mod = _stub("app.services.query_normalization_service")
_qns_mod.normalize_query_context = MagicMock(return_value=MagicMock())
_qns_mod.summarize_normalization = MagicMock(return_value="")
sys.modules["app.services.query_normalization_service"] = _qns_mod

_structured_answer_mod = _stub("app.services.structured_answer_service")
_structured_answer_mod.answer_graph_structured_extension = MagicMock(return_value=None)
sys.modules["app.services.structured_answer_service"] = _structured_answer_mod

_chat_planner_mod = _stub("app.services.chat_planner_service")
_chat_planner_mod.plan_chat_query = MagicMock()
sys.modules["app.services.chat_planner_service"] = _chat_planner_mod

_query_intent_mod = _stub("app.services.query_intent_service")
_query_intent_mod.parse_structured_query_intent = MagicMock(return_value=None)
sys.modules["app.services.query_intent_service"] = _query_intent_mod

_query_plan_mod = _stub("app.services.query_plan_service")
_query_plan_mod.plan_structured_query_with_gms = MagicMock(return_value=None)
sys.modules["app.services.query_plan_service"] = _query_plan_mod

_search_service_mod = _stub("app.services.search_service")
_search_service_mod.build_query_plan_view = MagicMock(return_value=None)
_search_service_mod.search_knowledge = MagicMock(return_value=None)
sys.modules["app.services.search_service"] = _search_service_mod

_evidence_service_mod = _stub("app.services.evidence_service")
_evidence_service_mod.group_answer_evidences = MagicMock()
sys.modules["app.services.evidence_service"] = _evidence_service_mod

# ---------------------------------------------------------------------------
# 3. 테스트 대상 임포트
#    (위 mock 이 완료된 후에 실제 answer_service 를 임포트)
# ---------------------------------------------------------------------------

import pytest  # noqa: E402
from unittest.mock import MagicMock  # noqa: F811 (재임포트, 위와 동일)

from app.services.answer_service import (  # noqa: E402
    build_extractive_answer,
    has_ambiguous_reference,
    has_followup_reference,
    has_structured_signal_query,
    infer_confidence_band,
    should_abort_for_low_confidence,
    should_accept_corrective_retry,
)
from app.schemas.answer import AnswerResponse  # noqa: E402
from app.schemas.search import QueryPlanView, SearchResult  # noqa: E402

# ---------------------------------------------------------------------------
# 4. 테스트용 헬퍼 팩토리
# ---------------------------------------------------------------------------


def _make_answer_response(
    *,
    retrieval_confidence: float | None = None,
    answer_status: str = "good_answer",
    confidence_reasons: list[str] | None = None,
    confidence_band: str | None = None,
) -> AnswerResponse:
    """테스트용 AnswerResponse 를 최소 필드만으로 생성합니다."""
    return AnswerResponse(
        query="테스트 질의",
        answer="테스트 답변",
        embeddingModel="test-model",
        chatModel="test-chat-model",
        retrievalConfidence=retrieval_confidence,
        answerStatus=answer_status,
        confidenceReasons=confidence_reasons or [],
        confidenceBand=confidence_band,
        excludedSourceTypes=[],
        evidences=[],
    )


def _make_search_result(source_type: str = "PROJECT_OPPORTUNITY") -> SearchResult:
    """테스트용 SearchResult 를 최소 필드만으로 생성합니다."""
    return SearchResult(
        sourceType=source_type,
        sourceId="TEST-001",
        title="테스트 제목",
        chunkIndex=0,
        distance=0.1,
        vectorScore=0.9,
        keywordScore=0.8,
        finalScore=0.85,
        matchedBy=["vector"],
        content="테스트 내용",
        metadata={},
    )


def _make_search_result_with_meta(
    source_type: str = "PROJECT_OPPORTUNITY",
    metadata: dict | None = None,
    title: str | None = None,
) -> SearchResult:
    return SearchResult(
        sourceType=source_type,
        sourceId="TEST-002",
        title=title,
        chunkIndex=0,
        distance=0.1,
        vectorScore=0.9,
        keywordScore=0.8,
        finalScore=0.85,
        matchedBy=["vector"],
        content="테스트 내용",
        metadata=metadata or {},
    )


def _make_query_plan(answer_style: str = "detailed") -> QueryPlanView:
    return QueryPlanView(
        task="semantic_search",
        target="project",
        answerStyle=answer_style,
        sourceTypes=["PROJECT_OPPORTUNITY"],
        filters={},
        missingFields=[],
        confidence=0.9,
    )


# ---------------------------------------------------------------------------
# 5. infer_confidence_band 테스트
# ---------------------------------------------------------------------------


class TestInferConfidenceBand:
    """infer_confidence_band(response) -> 'high' | 'medium' | 'low' | None"""

    # --- retrievalConfidence 분기 ---

    def test_high_when_confidence_gte_075(self):
        response = _make_answer_response(retrieval_confidence=0.75)
        assert infer_confidence_band(response) == "high"

    def test_high_when_confidence_above_075(self):
        response = _make_answer_response(retrieval_confidence=0.99)
        assert infer_confidence_band(response) == "high"

    def test_medium_when_confidence_between_05_and_075(self):
        response = _make_answer_response(retrieval_confidence=0.6)
        assert infer_confidence_band(response) == "medium"

    def test_medium_at_exactly_05(self):
        response = _make_answer_response(retrieval_confidence=0.5)
        assert infer_confidence_band(response) == "medium"

    def test_low_when_confidence_below_05(self):
        response = _make_answer_response(retrieval_confidence=0.3)
        assert infer_confidence_band(response) == "low"

    def test_low_when_confidence_is_zero(self):
        response = _make_answer_response(retrieval_confidence=0.0)
        assert infer_confidence_band(response) == "low"

    # --- confidence None + answerStatus 분기 ---

    def test_low_when_answer_status_upstream_degraded(self):
        response = _make_answer_response(answer_status="upstream_degraded")
        assert infer_confidence_band(response) == "low"

    def test_none_when_answer_status_clarification(self):
        response = _make_answer_response(answer_status="clarification")
        assert infer_confidence_band(response) is None

    def test_low_when_answer_status_insufficient_evidence(self):
        response = _make_answer_response(answer_status="insufficient_evidence")
        assert infer_confidence_band(response) == "low"

    # --- confidenceReasons 분기 ---

    def test_high_from_fast_structured_reason(self):
        response = _make_answer_response(confidence_reasons=["fast_structured"])
        assert infer_confidence_band(response) == "high"

    def test_high_from_comparison_query_reason(self):
        # "comparison_query" 가 high-set 에 있으므로 high 반환
        response = _make_answer_response(confidence_reasons=["comparison_query", "hybrid"])
        assert infer_confidence_band(response) == "high"

    def test_medium_from_hybrid_reason(self):
        response = _make_answer_response(confidence_reasons=["hybrid"])
        assert infer_confidence_band(response) == "medium"

    def test_medium_from_retrieval_retry_reason(self):
        response = _make_answer_response(confidence_reasons=["retrieval_retry"])
        assert infer_confidence_band(response) == "medium"

    def test_none_when_no_confidence_and_no_special_status(self):
        # good_answer + 빈 reasons → None
        response = _make_answer_response()
        assert infer_confidence_band(response) is None

    def test_none_with_unknown_reason(self):
        response = _make_answer_response(confidence_reasons=["unknown_reason"])
        assert infer_confidence_band(response) is None


# ---------------------------------------------------------------------------
# 6. should_abort_for_low_confidence 테스트
# ---------------------------------------------------------------------------


class TestShouldAbortForLowConfidence:
    """should_abort_for_low_confidence(query, search_response, normalization) -> bool"""

    def _call(self, query: str, search_response, normalization=None) -> bool:
        norm = normalization or MagicMock(target_hint=None)
        return should_abort_for_low_confidence(
            query=query,
            search_response=search_response,
            normalization=norm,
        )

    def test_abort_when_confidence_below_threshold(self):
        sr = MagicMock(retrievalConfidence=0.3, results=[_make_search_result()])
        assert self._call("사업 현황", sr) is True

    def test_abort_at_exactly_below_threshold(self):
        # 0.42 미만 → abort
        sr = MagicMock(retrievalConfidence=0.41, results=[_make_search_result()])
        assert self._call("사업 현황", sr) is True

    def test_no_abort_when_confidence_at_threshold(self):
        # 0.42 이상 + 결과 있음 → abort 안 함
        sr = MagicMock(retrievalConfidence=0.42, results=[_make_search_result()])
        assert self._call("사업 현황", sr) is False

    def test_abort_when_no_results(self):
        sr = MagicMock(retrievalConfidence=None, results=[])
        assert self._call("사업 현황", sr) is True

    def test_abort_when_results_is_none(self):
        sr = MagicMock(retrievalConfidence=None, results=None)
        assert self._call("사업 현황", sr) is True

    def test_abort_when_only_attachment_with_structured_signal(self):
        # "실주" 는 _STRUCTURED_SIGNAL_KEYWORDS 에 포함
        result = _make_search_result(source_type="ATTACHMENT")
        sr = MagicMock(retrievalConfidence=None, results=[result])
        assert self._call("실주 사유 알려줘", sr) is True

    def test_no_abort_when_only_attachment_without_structured_signal(self):
        result = _make_search_result(source_type="ATTACHMENT")
        sr = MagicMock(retrievalConfidence=None, results=[result])
        # 일반 질의 + target_hint 없음 → abort 안 함
        assert self._call("내용 요약해줘", sr) is False

    def test_abort_when_target_hint_opportunity_and_attachment_only(self):
        result = _make_search_result(source_type="ATTACHMENT")
        sr = MagicMock(retrievalConfidence=None, results=[result])
        norm = MagicMock(target_hint="opportunity")
        assert self._call("내용 알려줘", sr, norm) is True

    def test_no_abort_when_mixed_source_types_with_target_hint(self):
        results = [
            _make_search_result(source_type="ATTACHMENT"),
            _make_search_result(source_type="PROJECT_OPPORTUNITY"),
        ]
        sr = MagicMock(retrievalConfidence=None, results=results)
        norm = MagicMock(target_hint="opportunity")
        # mixed source_types 이므로 abort 안 함
        assert self._call("내용 알려줘", sr, norm) is False


# ---------------------------------------------------------------------------
# 7. should_accept_corrective_retry 테스트
# ---------------------------------------------------------------------------


class TestShouldAcceptCorrectiveRetry:
    """should_accept_corrective_retry(original, retry) -> bool"""

    def _make(self, confidence: float, result_count: int):
        obj = MagicMock()
        obj.retrievalConfidence = confidence
        obj.results = [MagicMock()] * result_count
        return obj

    def test_accept_when_retry_confidence_gte_original(self):
        original = self._make(0.5, 2)
        retry = self._make(0.7, 1)
        assert should_accept_corrective_retry(original=original, retry=retry) is True

    def test_accept_when_retry_count_greater_than_original(self):
        original = self._make(0.8, 2)
        retry = self._make(0.6, 5)
        assert should_accept_corrective_retry(original=original, retry=retry) is True

    def test_reject_when_retry_count_is_zero(self):
        original = self._make(0.5, 2)
        retry = self._make(0.9, 0)
        assert should_accept_corrective_retry(original=original, retry=retry) is False

    def test_accept_when_original_count_is_zero(self):
        # 원본 결과 없으면 retry 결과가 1건이라도 있으면 accept
        original = self._make(0.0, 0)
        retry = self._make(0.3, 1)
        assert should_accept_corrective_retry(original=original, retry=retry) is True

    def test_reject_when_retry_lower_confidence_and_fewer_results(self):
        original = self._make(0.8, 5)
        retry = self._make(0.5, 3)
        assert should_accept_corrective_retry(original=original, retry=retry) is False

    def test_accept_when_confidence_equal(self):
        original = self._make(0.6, 3)
        retry = self._make(0.6, 3)
        assert should_accept_corrective_retry(original=original, retry=retry) is True

    def test_handles_none_confidence(self):
        # retrievalConfidence 가 None 이면 0.0 으로 처리
        original = MagicMock()
        original.retrievalConfidence = None
        original.results = [MagicMock()]
        retry = MagicMock()
        retry.retrievalConfidence = None
        retry.results = [MagicMock()]
        # 0.0 >= 0.0 → accept
        assert should_accept_corrective_retry(original=original, retry=retry) is True


# ---------------------------------------------------------------------------
# 8. build_extractive_answer 테스트
# ---------------------------------------------------------------------------


class TestBuildExtractiveAnswer:
    """build_extractive_answer(query, plan, results) -> str"""

    def test_returns_default_message_when_no_results(self):
        answer = build_extractive_answer(query="질의", plan=None, results=[])
        assert "확인하기 어렵습니다" in answer

    def test_returns_answer_with_subject_name_from_metadata(self):
        result = _make_search_result_with_meta(
            metadata={"rootOpportunityName": "한국전력 통합관제"}
        )
        answer = build_extractive_answer(query="사업 현황", plan=None, results=[result])
        assert "한국전력 통합관제" in answer

    def test_returns_answer_with_title_when_no_metadata_name(self):
        result = _make_search_result_with_meta(title="특정 사업 제목", metadata={})
        answer = build_extractive_answer(query="사업 현황", plan=None, results=[result])
        assert "특정 사업 제목" in answer

    def test_returns_source_label_when_no_subject_name(self):
        result = _make_search_result_with_meta(
            source_type="SALES_ACTIVITY",
            title=None,
            metadata={},
        )
        answer = build_extractive_answer(query="사업 현황", plan=None, results=[result])
        # sourceType 라벨 "영업활동" 또는 결과 건수 포함 여부 확인
        assert "영업활동" in answer or "근거" in answer

    def test_timeline_style_with_subject_name(self):
        result = _make_search_result_with_meta(metadata={"rootOpportunityName": "A사업"})
        plan = _make_query_plan(answer_style="timeline")
        answer = build_extractive_answer(query="이력 확인", plan=plan, results=[result])
        assert "A사업" in answer
        assert "이력" in answer

    def test_timeline_style_without_subject_name(self):
        result = _make_search_result_with_meta(title=None, metadata={})
        plan = _make_query_plan(answer_style="timeline")
        answer = build_extractive_answer(query="이력 확인", plan=plan, results=[result])
        assert "이력" in answer

    def test_bullet_summary_style_with_subject_name(self):
        result = _make_search_result_with_meta(metadata={"rootOpportunityName": "B사업"})
        plan = _make_query_plan(answer_style="bullet_summary")
        answer = build_extractive_answer(query="요약", plan=plan, results=[result])
        assert "B사업" in answer

    def test_bullet_summary_style_without_subject_name_shows_count(self):
        results = [
            _make_search_result_with_meta(title=None, metadata={}),
            _make_search_result_with_meta(title=None, metadata={}),
        ]
        plan = _make_query_plan(answer_style="bullet_summary")
        answer = build_extractive_answer(query="요약", plan=plan, results=results)
        # 결과 건수(2) 가 언급되어야 함
        assert "2" in answer

    def test_strips_file_extension_from_title(self):
        result = _make_search_result_with_meta(title="보고서.pdf", metadata={})
        answer = build_extractive_answer(query="보고서", plan=None, results=[result])
        assert "보고서.pdf" not in answer
        assert "보고서" in answer

    def test_uses_top_3_results_for_subject_extraction(self):
        """results 가 3개 이상이어도 상위 3개만 subject 추출에 사용."""
        results = [
            _make_search_result_with_meta(metadata={"rootOpportunityName": f"사업{i}"})
            for i in range(5)
        ]
        answer = build_extractive_answer(query="사업 목록", plan=None, results=results)
        # 첫 번째 subject 는 반드시 포함
        assert "사업0" in answer


# ---------------------------------------------------------------------------
# 9. has_ambiguous_reference 테스트
# ---------------------------------------------------------------------------


class TestHasAmbiguousReference:
    """has_ambiguous_reference(query) -> bool"""

    def test_true_when_ambiguous_ref_and_decision_keyword(self):
        # "이 거" + "포기" → True
        assert has_ambiguous_reference("이 거 포기해야 하나요?") is True

    def test_true_with_그거_and_위험(self):
        assert has_ambiguous_reference("그 거 위험하지 않나요?") is True

    def test_true_with_아까_and_문제(self):
        assert has_ambiguous_reference("아까 문제 있던 건 어떻게 됐나요?") is True

    def test_false_when_no_ambiguous_ref(self):
        # 결정 키워드가 있어도 모호한 참조 없으면 False
        assert has_ambiguous_reference("한국전력 사업 포기해야 하나요?") is False

    def test_false_when_no_decision_keyword(self):
        # 모호한 참조는 있지만 결정 키워드 없음 → False
        assert has_ambiguous_reference("이 거 뭐야?") is False

    def test_false_empty_string(self):
        assert has_ambiguous_reference("") is False

    def test_true_with_방금_and_조심(self):
        assert has_ambiguous_reference("방금 말한 건 조심해야 해요?") is True

    def test_false_with_only_reference(self):
        # "위에" 만 있고 결정 키워드 없음
        assert has_ambiguous_reference("위에 내용 알려줘") is False


# ---------------------------------------------------------------------------
# 10. has_followup_reference 테스트
# ---------------------------------------------------------------------------


class TestHasFollowupReference:
    """has_followup_reference(query) -> bool"""

    def test_true_with_그건(self):
        assert has_followup_reference("그건 어떻게 됐나요?") is True

    def test_true_with_그_사건(self):
        assert has_followup_reference("그 사건 진행 상황은?") is True

    def test_true_with_해당_사업(self):
        assert has_followup_reference("해당 사업은 어디까지 진행됐나요?") is True

    def test_true_with_이_건(self):
        assert has_followup_reference("이 건 계속 진행 가능한가요?") is True

    def test_true_with_그_프로젝트(self):
        assert has_followup_reference("그 프로젝트 언제 끝나나요?") is True

    def test_false_with_no_followup_pattern(self):
        assert has_followup_reference("한국전력 사업 현황 알려줘") is False

    def test_false_empty_string(self):
        assert has_followup_reference("") is False

    def test_false_with_unrelated_query(self):
        assert has_followup_reference("최근 수주 현황은?") is False

    def test_true_with_저_거(self):
        # _FOLLOWUP_REF_PATTERN 에 "저\s*거" 포함
        assert has_followup_reference("저 거 다시 확인해줘") is True


# ---------------------------------------------------------------------------
# 11. has_structured_signal_query 테스트
# ---------------------------------------------------------------------------


class TestHasStructuredSignalQuery:
    """has_structured_signal_query(query) -> bool"""

    def test_true_with_실주(self):
        assert has_structured_signal_query("실주 사유 알려줘") is True

    def test_true_with_의사결정(self):
        assert has_structured_signal_query("의사결정 기준이 뭔가요?") is True

    def test_true_with_리스크(self):
        assert has_structured_signal_query("주요 리스크를 알려주세요") is True

    def test_true_with_견적서(self):
        assert has_structured_signal_query("견적서 내용 확인해줘") is True

    def test_true_with_긴급(self):
        assert has_structured_signal_query("긴급 처리가 필요한가요?") is True

    def test_false_with_no_signal_keyword(self):
        assert has_structured_signal_query("사업 현황 알려줘") is False

    def test_false_empty_string(self):
        assert has_structured_signal_query("") is False

    def test_true_with_근거_문서(self):
        assert has_structured_signal_query("근거 문서 보여줘") is True

    def test_true_with_결과보고(self):
        assert has_structured_signal_query("결과보고 작성 방법은?") is True

    def test_false_with_similar_but_not_matching(self):
        # "실적" 은 _STRUCTURED_SIGNAL_KEYWORDS 에 없음
        assert has_structured_signal_query("실적 현황 알려줘") is False
