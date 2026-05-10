package com.nkia.Orbis.domain.admin.permission.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.permission.dto.request.RoleCreateRequest;
import com.nkia.Orbis.domain.admin.permission.dto.request.RolePermissionRequest;
import com.nkia.Orbis.domain.admin.permission.dto.response.RoleResponse;
import com.nkia.Orbis.domain.admin.permission.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/roles")
@Tag(name = "Role", description = "권한 관리 API")
public class RoleController {
    private final RoleService roleService;

    @Operation(summary = "권한 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PERMISSION', 'READ')")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRoles()));
    }

    @Operation(summary = "권한 수정")
    @PutMapping("/{roleId}/permissions")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PERMISSION', 'UPDATE')")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRolePermissions(
            @PathVariable Long roleId,
            @RequestBody RolePermissionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                roleService.update(roleId, request)
        ));
    }

    @Operation(summary = "권한 생성")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PERMISSION', 'CREATE')")
    public ResponseEntity<ApiResponse<RoleResponse>> create(
            @RequestBody RoleCreateRequest request
    ) {
        RoleResponse response = roleService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}
