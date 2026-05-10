package com.nkia.Orbis.domain.chatbot.proxy.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatbotAiUserContext {

    private String userId;

    @Builder.Default
    private List<String> roles = new ArrayList<>();

    private List<String> accessibleSourceIds;

    private List<String> accessibleSourceTypes;

    @Builder.Default
    private List<String> workflowActorCodes = new ArrayList<>();

    private String department;

    @Builder.Default
    private Map<String, String> metadata = new LinkedHashMap<>();
}
