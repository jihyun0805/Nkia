package com.nkia.Orbis.domain.admin.user.dto.response;

import com.nkia.Orbis.domain.admin.permission.entity.Role;
import com.nkia.Orbis.domain.admin.user.entity.User;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MyInfoResponse {

    private UUID userId;
    private String name;
    private String email;
    private Set<String> roles;
    private Set<String> permissions;

    public static MyInfoResponse from(User user) {
        return MyInfoResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(user.getRoles().stream()
                        .map(Role::getName)
                        .collect(Collectors.toSet()))
                .permissions(user.getRoles().stream()
                        .flatMap(role -> role.getPermissions().stream())
                        .map(permission -> permission.getDomain() + "_" + permission.getAction())
                        .collect(Collectors.toSet()))
                .build();
    }
}
