package com.nkia.Orbis.domain.admin.permission.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.permission.dto.request.RolePermissionRequest;
import com.nkia.Orbis.domain.admin.permission.dto.response.RoleResponse;
import com.nkia.Orbis.domain.admin.permission.service.RoleService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/roles")
public class RoleController {
    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRoles()));
    }

    @PutMapping("/{roleId}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRolePermissions(
            @PathVariable Long roleId,
            @RequestBody RolePermissionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                roleService.update(roleId, request)
        ));
    }
}
