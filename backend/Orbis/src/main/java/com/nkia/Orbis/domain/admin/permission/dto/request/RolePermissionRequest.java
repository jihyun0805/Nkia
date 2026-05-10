package com.nkia.Orbis.domain.admin.permission.dto.request;

import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RolePermissionRequest {
    private Set<Long> permissionIds;
}
