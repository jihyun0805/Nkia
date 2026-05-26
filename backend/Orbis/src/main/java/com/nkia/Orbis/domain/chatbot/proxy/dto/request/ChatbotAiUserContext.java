// 인수인계: AI 검색 권한 필터에 쓰는 사용자 컨텍스트 DTO입니다.
// 핵심 흐름: userId/roles/department와 accessibleSourceTypes/accessSourceIds/domainActions를 AI user_context_access.py가 그대로 소비합니다.
// 같이 확인: null accessibleSourceIds는 전체 허용, 빈 리스트는 접근 가능한 문서 없음이라는 의미 차이를 유지해야 합니다.
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

    /**
     * 사용자가 도메인별로 보유한 액션 권한 매핑.
     * <p>키: {@link com.nkia.Orbis.domain.admin.permission.entity.PermissionDomain} enum 이름 (UPPER_SNAKE)</p>
     * <p>값: 해당 도메인에 대해 사용자가 가진 {@link com.nkia.Orbis.domain.admin.permission.entity.PermissionAction}
     * enum 이름 리스트 (예: ["READ", "UPDATE"]). 권한이 없으면 entry 자체를 넣지 않는다.</p>
     */
    @Builder.Default
    private Map<String, List<String>> domainActions = new LinkedHashMap<>();
}
