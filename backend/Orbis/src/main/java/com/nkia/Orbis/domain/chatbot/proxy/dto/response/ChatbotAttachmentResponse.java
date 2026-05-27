// 인수인계 메모: 챗봇 프록시 계층입니다. 프론트 요청을 받아 사용자 권한 컨텍스트를 조립하고 AI 서버로 전달합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
