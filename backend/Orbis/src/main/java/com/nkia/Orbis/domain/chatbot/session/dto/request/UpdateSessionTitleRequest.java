// 인수인계: 챗봇 세션 제목 수정 요청 DTO입니다.
// 핵심 흐름: 사용자가 사이드바에서 제목을 바꾸거나 첫 질문 요약 제목을 저장할 때 사용합니다.
// 같이 확인: 제목 길이/공백 정책 변경 시 프론트 summarizeTitle과 validation을 같이 맞추세요.
package com.nkia.Orbis.domain.chatbot.session.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateSessionTitleRequest {

    @NotBlank
    private String title;
}
