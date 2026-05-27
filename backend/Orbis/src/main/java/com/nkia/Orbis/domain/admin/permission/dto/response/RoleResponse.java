package com.nkia.Orbis.domain.admin.permission.dto.response;

import com.nkia.Orbis.domain.admin.permission.entity.Permission;
import com.nkia.Orbis.domain.admin.permission.entity.Role;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoleResponse {
    private Long roleId;
    private String roleName;
    private List<PermissionResponse> permissions;

    public static RoleResponse from(Role role) {
        return RoleResponse.builder()
                .roleId(role.getId())
                .roleName(role.getName())
                .permissions(role.getPermissions().stream()
                        .map(PermissionResponse::from)
                        .toList())
                .build();
    }

    @Getter
    @Builder
    public static class PermissionResponse {
        private Long permissionId;
        private String domain;
        private String action;

        public static PermissionResponse from(Permission permission) {
            return PermissionResponse.builder()
                    .permissionId(permission.getId())
                    .domain(permission.getDomain().getDescription())
                    .action(permission.getAction().getDescription())
                    .build();
        }
    }
}
