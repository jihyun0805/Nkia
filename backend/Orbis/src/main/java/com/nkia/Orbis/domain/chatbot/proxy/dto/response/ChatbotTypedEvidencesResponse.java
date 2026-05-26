// 인수인계: 근거를 검색/정형/요약 세 그룹으로 나눠 전달하는 DTO입니다.
// 핵심 흐름: 프론트는 이 그룹명을 그대로 사용해 근거 탭 섹션을 만들고, 없으면 evidences 단일 목록으로 fallback합니다.
// 같이 확인: AI evidence_service.py의 group_answer_evidences와 ChatEvidence 렌더링을 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatbotTypedEvidencesResponse {

    private List<ChatbotEvidenceResponse> retrievedEvidence = new ArrayList<>();
    private List<ChatbotEvidenceResponse> structuredEvidence = new ArrayList<>();
    private List<ChatbotEvidenceResponse> derivedSummaryEvidence = new ArrayList<>();
}
