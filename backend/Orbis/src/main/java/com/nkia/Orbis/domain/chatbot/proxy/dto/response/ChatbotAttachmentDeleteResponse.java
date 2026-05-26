// 인수인계: 첨부파일 삭제 API의 단순 성공 응답 DTO입니다.
// 핵심 흐름: ok=true 여부만 프론트에 전달하며 실제 삭제는 AI 색인 DELETE 이벤트가 처리합니다.
// 같이 확인: 삭제 실패 메시지는 ChatbotProxyService의 예외 매핑을 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChatbotAttachmentDeleteResponse {

    private boolean ok;
}
