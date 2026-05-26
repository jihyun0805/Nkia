// 인수인계: AI 검색 근거 한 건을 표현하는 DTO입니다.
// 핵심 흐름: sourceType/sourceId/title/content/metadata와 vector/keyword/finalScore가 프론트 근거 카드와 화면 이동 링크의 입력입니다.
// 같이 확인: metadata key 변경 시 frontend chatbot-evidence-links.ts 라우팅 규칙을 같이 보세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatbotEvidenceResponse {

    private String evidenceType;
    private String sourceType;
    private String sourceId;
    private String title;
    private Integer chunkIndex;
    private Double distance;
    private Double vectorScore;
    private Double keywordScore;
    private Double finalScore;
    private List<String> matchedBy = new ArrayList<>();
    private String content;
    private Map<String, Object> metadata = new HashMap<>();
}
