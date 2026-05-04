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
