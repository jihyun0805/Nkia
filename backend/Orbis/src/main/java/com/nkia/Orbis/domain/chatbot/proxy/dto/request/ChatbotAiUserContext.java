// 인수인계 메모: 챗봇 프록시 계층입니다. 프론트 요청을 받아 사용자 권한 컨텍스트를 조립하고 AI 서버로 전달합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
