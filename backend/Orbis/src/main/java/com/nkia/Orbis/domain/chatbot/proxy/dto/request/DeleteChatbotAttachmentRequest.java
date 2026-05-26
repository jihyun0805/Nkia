// 인수인계: 챗봇 임시 첨부파일 삭제 요청 DTO입니다.
// 핵심 흐름: sessionId와 fileId를 받아 AI ATTACHMENT 색인에 DELETE 이벤트를 보내는 데 사용합니다.
// 같이 확인: 프론트 deleteChatbotAttachment와 AI indexing attachment delete payload를 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DeleteChatbotAttachmentRequest {

    @NotBlank
    private String sessionId;

    @NotBlank
    private String fileId;
}
