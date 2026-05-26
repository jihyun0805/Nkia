// 인수인계: 임시 첨부파일 업로드/색인 결과 DTO입니다.
// 핵심 흐름: AI가 반환한 fileId, sourceId, indexedStatus, preview를 프론트가 pending attachment 정리와 표시용으로 사용합니다.
// 같이 확인: AI api/chat_attachments.py 응답 필드와 frontend UploadedChatbotAttachment 타입을 같이 확인하세요.
package com.nkia.Orbis.domain.chatbot.proxy.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatbotAttachmentResponse {

    private String fileId;
    private String fileName;
    private String extension;
    private String fileType;
    private Long size;
    private String indexedStatus;
    private String sourceId;
    private String preview;
}
