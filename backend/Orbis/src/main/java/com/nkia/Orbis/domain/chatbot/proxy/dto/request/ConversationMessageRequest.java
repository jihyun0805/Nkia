package com.nkia.Orbis.domain.chatbot.proxy.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ConversationMessageRequest {

    @Pattern(regexp = "user|assistant")
    private String role;

    @NotBlank
    private String content;
}
