// 인수인계: AI 검색 가능한 문서 기간 범위 응답 DTO입니다.
// 핵심 흐름: startAt/endAt은 검색 필터 UI나 기간 안내에 사용할 수 있는 전체 색인 데이터의 최소/최대 일자입니다.
// 같이 확인: AI /search/date-range 응답과 프론트 기간 필터 UI를 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatbotDateRangeResponse {

    private String startAt;
    private String endAt;
}
