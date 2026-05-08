package com.nkia.Orbis.domain.admin.department.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.department.dto.request.DepartmentRequest;
import com.nkia.Orbis.domain.admin.department.dto.response.DepartmentResponse;
import com.nkia.Orbis.domain.admin.department.service.DepartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Department", description = "부서 관리 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/departments")
public class DepartmentController {
    private final DepartmentService departmentService;

    @Operation(summary = "부서 생성")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> createDepartment(
            @Valid
            @RequestBody DepartmentRequest request
    ) {
        DepartmentResponse response = departmentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "부서 목록 조회")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getDepartments() {
        List<DepartmentResponse> response = departmentService.getDepartments();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "부서 삭제")
    @DeleteMapping("/{departmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("departmentId") Long departmentId
    ) {
        departmentService.delete(departmentId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 수정")
    @PatchMapping("/{departmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> update(
            @PathVariable("departmentId") Long departmentId,
            @RequestBody DepartmentRequest request
    ) {
        DepartmentResponse response = departmentService.update(departmentId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}