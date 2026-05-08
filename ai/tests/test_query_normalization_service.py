from app.services.query_normalization_service import normalize_query_context


def test_rfp_analysis_detail_query_prefers_rfp_analysis_source_types() -> None:
    query = (
        "SK텔레콤 클라우드 인프라 통합 운영 플랫폼 구축 사업 "
        "RFP 분석한 것 들 중에서 통합 모니터링쪽 검토내용/지원여부/공수 등이 어떻게 되니??"
    )

    normalization = normalize_query_context(query)

    assert normalization.target_hint == "document"
    assert normalization.source_type_hints == ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]
    assert "SK텔레콤" in normalization.entity_terms


def test_rfp_analysis_progress_query_filters_noise_terms() -> None:
    query = "SK텔레콤 지금 진행중인 사업 rfp 분석한거 보여줘"

    normalization = normalize_query_context(query)

    assert normalization.source_type_hints == ["RFP_ANALYSIS", "RFP", "ATTACHMENT"]
    assert "SK텔레콤" in normalization.entity_terms
    assert "지금" not in normalization.entity_terms
    assert "진행중인" not in normalization.entity_terms
