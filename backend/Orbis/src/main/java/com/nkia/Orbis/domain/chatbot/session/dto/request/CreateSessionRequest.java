// 인수인계: 새 챗봇 대화방 생성 요청 DTO입니다.
// 핵심 흐름: title만 받아 현재 ownerId와 묶어 ChatSession을 만들며, 제목은 첫 질문 기준으로 나중에 수정될 수 있습니다.
// 같이 확인: 프론트 createNewConversation과 ChatSessionService.createSession을 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.session.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateSessionRequest {

    @NotBlank
    private String title;
}
