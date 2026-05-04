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
