package com.nkia.Orbis.domain.admin.permission.dto.request;

import com.nkia.Orbis.domain.admin.permission.entity.PermissionAction;
import com.nkia.Orbis.domain.admin.permission.entity.PermissionDomain;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RolePermissionRequest {
    private Set<PermissionItem> permissions;

    @Getter
    @NoArgsConstructor
    public static class PermissionItem {
        private PermissionDomain domain;
        private PermissionAction action;
    }
}
