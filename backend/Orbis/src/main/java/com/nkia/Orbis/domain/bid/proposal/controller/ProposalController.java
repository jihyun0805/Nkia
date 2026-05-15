package com.nkia.Orbis.domain.bid.proposal.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.bid.proposal.dto.request.ProposalCreateRequest;
import com.nkia.Orbis.domain.bid.proposal.dto.request.ProposalUpdateRequest;
import com.nkia.Orbis.domain.bid.proposal.dto.response.ProposalDetailResponse;
import com.nkia.Orbis.domain.bid.proposal.dto.response.ProposalListResponse;
import com.nkia.Orbis.domain.bid.proposal.service.ProposalService;
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
@Tag(name = "Proposal", description = "제안서 관리 API")
@RequestMapping("/proposals")
public class ProposalController {

    private final ProposalService proposalService;

    /**
     * 1. 제안서 등록 (POST)
     */
    @Operation(summary = "제안서 등록", description = "새로운 제안서를 등록하고 생성된 제안서의 ID를 반환합니다.")
    @PostMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROPOSAL', 'CREATE')")
    public ResponseEntity<ApiResponse<Long>> createProposal(@Valid @RequestBody ProposalCreateRequest request) {
        Long proposalId = proposalService.createProposal(request);
        // 리소스가 성공적으로 생성되었으므로 201 Created 반환
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(proposalId));
    }

    /**
     * 2. 제안서 목록 조회 (GET)
     */
    @Operation(summary = "제안서 목록 조회", description = "제안서 목록을 페이징 처리하여 조회합니다.")
    @GetMapping
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROPOSAL', 'READ')")
    public ResponseEntity<ApiResponse<Page<ProposalListResponse>>> getProposalList(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ProposalListResponse> response = proposalService.getProposalList(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 3. 제안서 상세 조회 (GET)
     */
    @Operation(summary = "제안서 상세 조회", description = "특정 제안서의 상세 정보와 첨부파일 URL을 조회합니다.")
    @GetMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROPOSAL', 'READ')")
    public ResponseEntity<ApiResponse<ProposalDetailResponse>> getProposalDetail(@PathVariable("id") Long id) {
        ProposalDetailResponse response = proposalService.getProposalDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 4. 제안서 정보 수정 (PUT)
     */
    @Operation(summary = "제안서 정보 수정", description = "제안서의 상태 및 첨부파일을 수정합니다.")
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROPOSAL', 'UPDATE')")
    public ResponseEntity<ApiResponse<Long>> updateProposal(
            @PathVariable("id") Long id,
            @Valid @RequestBody ProposalUpdateRequest request) {
        Long proposalId = proposalService.updateProposal(id, request);
        return ResponseEntity.ok(ApiResponse.success(proposalId));
    }

    /**
     * 5. 제안서 삭제 (DELETE)
     */
    @Operation(summary = "제안서 삭제", description = "제안서를 논리적(Soft)으로 삭제합니다.")
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.hasPermission(authentication, 'PROPOSAL', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteProposal(@PathVariable("id") Long id) {
        proposalService.deleteProposal(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}