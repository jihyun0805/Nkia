package com.nkia.Orbis.domain.chatbot.session.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AddMessageRequest {

    // "user" question
    @NotBlank
    private String userContent;

    // "assistant" answer
    @NotBlank
    private String assistantContent;

    private String threadId;

    private String route;

    private String answerStatus;

    // Optional: JSON string of evidences list for the assistant message
    private String evidences;

    private String typedEvidences;

    private String actions;
}
