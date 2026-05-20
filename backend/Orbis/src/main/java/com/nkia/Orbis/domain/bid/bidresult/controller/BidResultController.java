package com.nkia.Orbis.domain.bid.bidresult.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.request.SubmitRequest;
import com.nkia.Orbis.domain.bid.bidresult.dto.request.BidResultCreateRequest;
import com.nkia.Orbis.domain.bid.bidresult.dto.request.BidResultUpdateRequest;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultDetailResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultHistoryListResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultHistoryResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultInfoResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultListResponse;
import com.nkia.Orbis.domain.bid.bidresult.service.BidResultService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Bid Result", description = "입찰 결과 관련 API")
@RequestMapping("/bid-results")
public class BidResultController {

    private final BidResultService bidResultService;

    /**
     * 1. 입찰 결과 등록 (POST)
     *
     * @param request @Valid를 통해 DTO의 유효성 검사 수행
     * @return 201 Created와 생성된 입찰 결과 상세 데이터 반환
     */
    @Operation(summary = "입찰 결과 등록", description = "새로운 입찰 결과 정보를 등록합니다.")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'CREATE')")
    public ResponseEntity<ApiResponse<BidResultDetailResponse>> createBidResult(
            @Valid @RequestBody BidResultCreateRequest request) {

        // 1. Service를 통해 입찰 결과 생성 후 ID 반환
        Long createdId = bidResultService.createBidResult(request);

        // 2. 생성된 입찰 결과의 상세 정보를 다시 조회하여 응답
        BidResultDetailResponse response = bidResultService.getBidResultDetail(createdId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /**
     * 2. 입찰 결과 상세 조회 (GET)
     */
    @Operation(summary = "입찰 결과 상세 조회", description = "입찰 결과 ID로 상세 정보 및 원인 분석 내역을 조회합니다.")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<BidResultDetailResponse>> getBidResultDetail(@PathVariable Long id) {
        BidResultDetailResponse response = bidResultService.getBidResultDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 3. 입찰 결과 목록 조회 (GET)
     *
     * @param pageable 페이징 및 정렬 파라미터 (기본값: 최신 등록순)
     */
    @Operation(summary = "입찰 결과 목록 조회", description = "페이징 처리된 입찰 결과 목록을 최신순으로 조회합니다.")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<Page<BidResultListResponse>>> getBidResultList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<BidResultListResponse> response = bidResultService.getBidResultList(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 4. 입찰 결과 정보 수정 (PUT)
     */
    @Operation(summary = "입찰 결과 정보 수정", description = "기존 입찰 결과 및 점수/분석 정보를 수정합니다.")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'UPDATE')")
    public ResponseEntity<ApiResponse<BidResultDetailResponse>> updateBidResult(@PathVariable Long id,
                                                                                @Valid @RequestBody BidResultUpdateRequest request) {
        // 1. Service를 통해 입찰 결과 정보 수정 (더티 체킹)
        bidResultService.updateBidResult(id, request);

        // 2. 수정이 반영된 후의 상세 정보를 조회하여 응답
        BidResultDetailResponse response = bidResultService.getBidResultDetail(id);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 5. 입찰 결과 삭제 (DELETE - Soft Delete)
     */
    @Operation(summary = "입찰 결과 삭제", description = "입찰 결과 정보를 논리적(Soft)으로 삭제합니다.")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteBidResult(@PathVariable Long id) {
        bidResultService.deleteBidResult(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "입찰 결과 결재 상신")
    @PostMapping("/submit/{bidResultId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'CREATE')")
    public ResponseEntity<ApiResponse<String>> submitBidResult(
            @PathVariable("bidResultId") Long bidResultId,
            @RequestBody SubmitRequest request
    ) {
        bidResultService.submitBidResult(
                bidResultId,
                request.getFirstApproverId()
        );

        return ResponseEntity.ok(ApiResponse.success("입찰 결과 결재 상신 완료"));
    }

    /**
     * 6. 입찰 결과 변경 이력 목록 조회 (GET)
     */
    @Operation(summary = "입찰 결과 변경 이력 목록 조회", description = "특정 입찰 결과의 변경 이력을 최신 버전순으로 조회합니다.")
    @GetMapping("/{id}/histories")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<List<BidResultHistoryListResponse>>> getBidResultHistories(
            @PathVariable Long id) {
        List<BidResultHistoryListResponse> response = bidResultService.getBidResultHistories(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 7. 입찰 결과 변경 이력 상세 조회 (GET)
     */
    @Operation(summary = "입찰 결과 변경 이력 상세 조회", description = "특정 버전의 과거 입찰 결과 스냅샷 및 경쟁사 점수/분석 내역을 상세 조회합니다.")
    @GetMapping("/histories/{historyId}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<BidResultHistoryResponse>> getBidResultHistoryDetail(
            @PathVariable Long historyId) {
        BidResultHistoryResponse response = bidResultService.getBidResultHistoryDetail(historyId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "입찰 결과 기본 정보 조회", description = "제안서 ID를 기반으로 입찰 결과 폼 작성 시 필요한 기본 정보를 조회합니다.")
    @GetMapping("/pre-fill")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'BID_RESULT', 'READ')")
    public ResponseEntity<ApiResponse<BidResultInfoResponse>> getBidResultInfo(
            @RequestParam(name = "proposalId") Long proposalId) {

        BidResultInfoResponse response = bidResultService.getBidResultInfo(proposalId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}