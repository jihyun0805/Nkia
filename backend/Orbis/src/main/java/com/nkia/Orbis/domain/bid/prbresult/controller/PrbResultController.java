package com.nkia.Orbis.domain.bid.prbresult.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.bid.prbresult.dto.request.PrbResultCreateRequest;
import com.nkia.Orbis.domain.bid.prbresult.dto.request.PrbResultUpdateRequest;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultListResponse;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultResponse;
import com.nkia.Orbis.domain.bid.prbresult.service.PrbResultService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    /**
     * 1. PRB 결과 등록 (POST)
     */
    @Operation(summary = "PRB 결과 등록")
    @PostMapping
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
    public ResponseEntity<ApiResponse<PrbResultResponse>> getPrbResult(@PathVariable Long id) {
        PrbResultResponse response = prbResultService.getPrbResult(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 3. PRB 결과 목록 조회 (GET) 페이징과 정렬을 지원하며, 기본값은 최신 생성순입니다.
     */
    @Operation(summary = "PRB 결과 목록 조회")
    @GetMapping
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
    public ResponseEntity<ApiResponse<Void>> deletePrbResult(@PathVariable Long id) {
        prbResultService.deletePrbResult(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}