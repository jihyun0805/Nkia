package com.nkia.Orbis.domain.bid.prb.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.SubmitRequest;
import com.nkia.Orbis.domain.bid.prb.dto.request.PrbCreateRequestDto;
import com.nkia.Orbis.domain.bid.prb.dto.request.PrbUpdateRequestDto;
import com.nkia.Orbis.domain.bid.prb.dto.response.PrbResponseDto;
import com.nkia.Orbis.domain.bid.prb.service.PrbService;
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
@Tag(name = "PRB", description = "PRB 관련 API")
@RequestMapping("/prbs")
public class PrbController {

    private final PrbService prbService;

    /**
     * 1. PRB 정보 등록 (POST)
     *
     * @param request @Valid를 통해 DTO의 유효성 검사 수행
     * @return 201 Created와 생성된 PRB 상세 데이터 반환
     */
    @Operation(summary = "PRB 등록", description = "새로운 PRB 정보를 등록합니다.")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB', 'CREATE')")
    public ResponseEntity<ApiResponse<PrbResponseDto>> createPrb(
            @Valid @RequestBody PrbCreateRequestDto request) {

        // 1. Service를 통해 PRB 생성 후 ID 반환
        Long createdId = prbService.createPrb(request);

        // 2. 생성된 PRB의 상세 정보를 다시 조회하여 응답 (Rfp 패턴 적용)
        PrbResponseDto response = prbService.getPrbDetail(createdId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 2. PRB 상세 조회 (GET)
     */
    @Operation(summary = "PRB 상세 조회", description = "PRB ID로 상세 정보 및 비용 내역을 조회합니다.")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB', 'READ')")
    public ResponseEntity<ApiResponse<PrbResponseDto>> getPrbDetail(@PathVariable Long id) {
        PrbResponseDto response = prbService.getPrbDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 3. PRB 목록 조회 (GET)
     *
     * @param pageable 페이징 및 정렬 파라미터 (기본값: 최신 등록순)
     */
    @Operation(summary = "PRB 목록 조회", description = "페이징 처리된 PRB 목록을 최신순으로 조회합니다.")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB', 'READ')")
    public ResponseEntity<ApiResponse<Page<PrbResponseDto>>> getPrbList(
            @PageableDefault(size = 10, sort = "createdAt",
                    direction = Sort.Direction.DESC) Pageable pageable) {
        Page<PrbResponseDto> response = prbService.getPrbList(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 4. PRB 정보 수정 (PUT)
     */
    @Operation(summary = "PRB 정보 수정", description = "기존 PRB 정보를 수정하고 재계산된 결과를 반환합니다.")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB', 'UPDATE')")
    public ResponseEntity<ApiResponse<PrbResponseDto>> updatePrb(@PathVariable Long id,
                                                                 @Valid @RequestBody PrbUpdateRequestDto request) {

        // 1. Service를 통해 PRB 정보 수정 (더티 체킹)
        prbService.updatePrb(id, request);

        // 2. 수정이 반영된 후의 상세 정보를 조회하여 응답
        PrbResponseDto response = prbService.getPrbDetail(id);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 5. PRB 정보 삭제 (DELETE - Soft Delete)
     */
    @Operation(summary = "PRB 삭제", description = "PRB 정보를 논리적(Soft)으로 삭제합니다.")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deletePrb(@PathVariable Long id) {
        prbService.deletePrb(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "PRB 보고서 결재 상신")
    @PostMapping("/submit/{prbId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PRB', 'CREATE')")
    public ResponseEntity<ApiResponse<String>> submitPrb(
            @PathVariable("prbId") Long prbId,
            @RequestBody SubmitRequest request
    ) {
        prbService.submitPrb(
                prbId,
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(ApiResponse.success("PRB 보고서 결재 상신 완료"));
    }
}
