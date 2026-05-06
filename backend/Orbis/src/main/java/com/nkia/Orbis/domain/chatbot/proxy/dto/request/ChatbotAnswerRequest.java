package com.nkia.Orbis.domain.chatbot.proxy.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatbotAnswerRequest {

    @NotBlank
    private String query;

    @Valid
    private List<ConversationMessageRequest> history = new ArrayList<>();

    @Min(1)
    @Max(10)
    private Integer limit = 5;

    private String threadId;

    private String attachmentSessionId;

    private String startAt;

    private String endAt;
}
