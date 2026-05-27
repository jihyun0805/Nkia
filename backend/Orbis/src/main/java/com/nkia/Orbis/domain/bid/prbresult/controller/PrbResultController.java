package com.nkia.Orbis.domain.bid.prbresult.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.SubmitRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowResponse;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.bid.prbresult.dto.request.PrbResultCreateRequest;
import com.nkia.Orbis.domain.bid.prbresult.dto.request.PrbResultUpdateRequest;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultHistoryListResponse;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultHistoryResponse;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultListResponse;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultResponse;
import com.nkia.Orbis.domain.bid.prbresult.service.PrbResultService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "PRB Result", description = "PRB 결과 관련 API")
@RequestMapping("/prb-results")
public class PrbResultController {

    private final PrbResultService prbResultService;
    private final WorkflowService workflowService;

    /**
     * 1. PRB 결과 등록 (POST)
     */
    @Operation(summary = "PRB 결과 등록")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB_RESULT', 'CREATE')")
    public ResponseEntity<ApiResponse<PrbResultResponse>> createPrbResult(
            @Valid @RequestBody PrbResultCreateRequest request) {
        PrbResultResponse response = prbResultService.createPrbResult(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 2. PRB 결과 상세 조회 (GET)
     */
    @Operation(summary = "PRB 결과 상세 조회")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<PrbResultResponse>> getPrbResult(@PathVariable Long id) {
        PrbResultResponse response = prbResultService.getPrbResult(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 3. PRB 결과 목록 조회 (GET) 페이징과 정렬을 지원하며, 기본값은 최신 생성순입니다.
     */
    @Operation(summary = "PRB 결과 목록 조회")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<Page<PrbResultListResponse>>> getPrbResultList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<PrbResultListResponse> response = prbResultService.getPrbResultList(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 4. PRB 결과 정보 수정 (PUT)
     */
    @Operation(summary = "PRB 결과 정보 수정")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB_RESULT', 'UPDATE')")
    public ResponseEntity<ApiResponse<PrbResultResponse>> updatePrbResult(
            @PathVariable Long id,
            @Valid @RequestBody PrbResultUpdateRequest request) {
        PrbResultResponse response = prbResultService.updatePrbResult(id, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 5. PRB 결과 삭제 (DELETE) Soft Delete 방식이 적용되어 실제 데이터는 보존됩니다.
     */
    @Operation(summary = "PRB 결과 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB_RESULT', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deletePrbResult(@PathVariable Long id) {
        prbResultService.deletePrbResult(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 6. PRB 결과 변경 이력 목록 조회 (GET)
     */
    @Operation(summary = "PRB 결과 변경 이력 목록 조회", description = "특정 PRB 결과보고서의 변경 이력을 최신 버전순으로 조회합니다.")
    @GetMapping("/{id}/histories")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'QUOTATION', 'READ')")
    public ResponseEntity<ApiResponse<List<PrbResultHistoryListResponse>>> getPrbResultHistories(
            @PathVariable Long id) {
        List<PrbResultHistoryListResponse> response = prbResultService.getPrbResultHistories(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 7. PRB 결과 변경 이력 상세 조회 (GET)
     */
    @Operation(summary = "PRB 결과 변경 이력 상세 조회", description = "특정 버전의 과거 PRB 결과 스냅샷 및 회의 참석자 의견을 상세 조회합니다.")
    @GetMapping("/histories/{historyId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'QUOTATION', 'READ')")
    public ResponseEntity<ApiResponse<PrbResultHistoryResponse>> getPrbResultHistoryDetail(
            @PathVariable Long historyId) {
        PrbResultHistoryResponse response = prbResultService.getPrbResultHistoryDetail(historyId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "PRB 결과보고서 결재 상신")
    @PostMapping("/submit/{prbResultId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB_RESULT', 'CREATE')")
    public ResponseEntity<ApiResponse<String>> submitPrbResult(
            @PathVariable("prbResultId") Long prbResultId,
            @RequestBody SubmitRequest request
    ) {
        prbResultService.submitPrbResult(
                prbResultId,
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(ApiResponse.success("PRB 결과보고서 결재 상신 완료"));
    }

    @Operation(summary = "PRB 결과 결재 상세 조회")
    @GetMapping("/workflow/{workflowId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<WorkflowResponse>> getWorkflow(
            @PathVariable("workflowId") Long workflowId
    ) {
        WorkflowResponse response = workflowService.getWorkflowDetail(workflowId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
