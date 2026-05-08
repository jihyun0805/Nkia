from app.services.document_builder import build_attachment_document_text, build_document_text


def test_build_rfp_analysis_document_text_formats_requirement_rows() -> None:
    payload = {
        "customerName": "SK텔레콤",
        "opportunityCode": "OPP-2026-004",
        "opportunityName": "SK텔레콤 클라우드 인프라 통합 운영 플랫폼 구축 사업",
        "businessDivision": "EMS",
        "proposalType": "SI 제안",
        "submissionDeadline": "2026-03-30",
        "salesRepresentative": "최민수",
        "manager": "김영업",
        "requestedAt": "2026-03-12",
        "analysisStatus": "접수",
        "requirements": [
            {
                "category": "시스템 기능 요구사항",
                "requirementNo": "REQ-001",
                "requirementName": "통합 모니터링",
                "requirementDetail": "서버, 네트워크, 데이터베이스 및 애플리케이션을 통합 모니터링할 수 있어야 한다.",
                "supportStatus": "O",
                "reviewNote": "기본 기능으로 제공",
                "mandays": 0,
            },
            {
                "category": "시스템 기능 요구사항",
                "requirementNo": "REQ-002",
                "requirementName": "분산 수집",
                "requirementDetail": "대규모 환경 확장을 고려한 분산 수집 구조를 지원할 수 있어야 한다.",
                "supportStatus": "∆",
                "reviewNote": "구성 변경 필요, Proxy 대신 클러스터 분산 수집 구조로 대응",
                "mandays": 5,
            },
        ],
    }

    text = build_document_text(
        source_type="RFP_ANALYSIS",
        title="SK텔레콤 클라우드 인프라 통합 운영 플랫폼 구축 사업 RFP 분석",
        content=None,
        payload=payload,
    )

    assert "고객사: SK텔레콤" in text
    assert "사업기회코드: OPP-2026-004" in text
    assert "요구사항명칭: 통합 모니터링" in text
    assert "지원여부: O" in text
    assert "검토 내용: 기본 기능으로 제공" in text
    assert "공수(M/D): 5" in text
    assert "총 공수(M/D): 5" in text


def test_build_attachment_document_text_normalizes_html_excel_export() -> None:
    html = """
    <html>
      <body>
        <table>
          <tr><th colspan="2">기본 정보</th></tr>
          <tr><td>고객사</td><td>SK텔레콤 (CUS-004)</td></tr>
          <tr><td>사업명</td><td>SK텔레콤 NMS 업그레이드 (OPP-2026-004)</td></tr>
        </table>
        <table>
          <tr><th>요구사항명칭</th><th>지원여부</th><th>검토 내용</th><th>공수(M/D)</th></tr>
          <tr><td>통합 모니터링</td><td>O</td><td>기본 기능으로 제공</td><td>0</td></tr>
        </table>
      </body>
    </html>
    """

    text = build_attachment_document_text(
        title="RFP-예시.xls",
        content=html,
        payload={"fileType": "application/vnd.ms-excel"},
    )

    assert "<table" not in text.lower()
    assert "고객사 | SK텔레콤 (CUS-004)" in text
    assert "사업명 | SK텔레콤 NMS 업그레이드 (OPP-2026-004)" in text
    assert "통합 모니터링 | O | 기본 기능으로 제공 | 0" in text
