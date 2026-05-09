package com.nkia.Orbis.domain.bid.rfpanalyzeresult.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request.RfpAnalyzeResultCreateRequest;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request.RfpAnalyzeResultUpdateRequest;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response.RfpAnalyzeResultDetailResponse;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response.RfpAnalyzeResultListResponse;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.service.RfpAnalyzeResultService;
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
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "RFP Analyze Result", description = "RFP 분석 결과 관련 API")
@RequestMapping("/rfp-analyze-results")
public class RfpAnalyzeResultController {

  private final RfpAnalyzeResultService rfpAnalyzeResultService;

  /**
   * 1. RFP 분석 결과 등록 (POST)
   *
   * @param request @Valid를 통해 DTO의 유효성 검사 수행
   * @return 201 Created와 생성된 데이터 반환
   */
  @Operation(summary = "RFP 분석 결과 등록")
  @PostMapping
  public ResponseEntity<ApiResponse<RfpAnalyzeResultDetailResponse>> createRfpAnalyzeResult(
      @Valid @RequestBody RfpAnalyzeResultCreateRequest request) {
    RfpAnalyzeResultDetailResponse response =
        rfpAnalyzeResultService.createRfpAnalyzeResult(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
  }

  /**
   * 2. RFP 분석 결과 상세 조회 (GET)
   */
  @Operation(summary = "RFP 분석 결과 상세 조회")
  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<RfpAnalyzeResultDetailResponse>> getRfpAnalyzeResult(
      @PathVariable Long id) {
    RfpAnalyzeResultDetailResponse response = rfpAnalyzeResultService.getRfpAnalyzeResult(id);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  /**
   * 3. RFP 분석 결과 목록 조회 (GET)
   *
   * @param pageable 페이징 및 정렬 파라미터 (기본값: 최신순 정렬)
   */
  @Operation(summary = "RFP 분석 결과 목록 조회")
  @GetMapping
  public ResponseEntity<ApiResponse<Page<RfpAnalyzeResultListResponse>>> getRfpAnalyzeResultList(
      @PageableDefault(size = 10, sort = "createdAt",
          direction = Sort.Direction.DESC) Pageable pageable) {
    Page<RfpAnalyzeResultListResponse> response =
        rfpAnalyzeResultService.getRfpAnalyzeResultList(pageable);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  /**
   * 4. RFP 분석 결과 정보 수정 (PUT)
   */
  @Operation(summary = "RFP 분석 결과 정보 수정")
  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<RfpAnalyzeResultDetailResponse>> updateRfpAnalyzeResult(
      @PathVariable Long id, @Valid @RequestBody RfpAnalyzeResultUpdateRequest request) {
    RfpAnalyzeResultDetailResponse response =
        rfpAnalyzeResultService.updateRfpAnalyzeResult(id, request);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  /**
   * 5. RFP 분석 결과 삭제 (DELETE) Soft Delete 방식이므로 실제 데이터는 남지만 논리적으로 삭제됨
   */
  @Operation(summary = "RFP 분석 결과 정보 삭제")
  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteRfpAnalyzeResult(@PathVariable Long id) {
    rfpAnalyzeResultService.deleteRfpAnalyzeResult(id);
    return ResponseEntity.ok(ApiResponse.success(null));
  }
}
