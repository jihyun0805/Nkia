package com.nkia.Orbis.domain.admin.permission.dto.response;


import com.nkia.Orbis.domain.admin.permission.entity.Permission;
import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.user.entity.User;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserRoleDetailResponse {


    private UUID userId;
    private String name;
    private String email;
    private List<RolePermissionResponse> roles;

    public static UserRoleDetailResponse from(User user) {
        return UserRoleDetailResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(user.getRoles().stream()
                        .map(RolePermissionResponse::from)
                        .toList())
                .build();
    }

    @Getter
    @Builder
    public static class RolePermissionResponse {
        private Long roleId;
        private String roleName;
        private List<PermissionResponse> permissions;

        public static RolePermissionResponse from(Role role) {
            return RolePermissionResponse.builder()
                    .roleId(role.getId())
                    .roleName(role.getName())
                    .permissions(role.getPermissions().stream()
                            .map(PermissionResponse::from)
                            .toList())
                    .build();
        }
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
                    .domain(permission.getDomain().name())
                    .action(permission.getAction().name())
                    .build();
        }
    }
}
