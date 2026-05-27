package com.nkia.Orbis.domain.admin.permission.dto.response;

import com.nkia.Orbis.domain.admin.permission.entity.Role;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoleListResponse {
    private Long id;
    private String name;
    private Set<String> permissions;

    public static RoleListResponse from(Role role) {
        return RoleListResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .permissions(role.getPermissions().stream()
                        .map(permission -> permission.getDomain().getDescription() + "_" + permission.getAction()
                                .getDescription())
                        .collect(Collectors.toSet()))
                .build();
    }
}
