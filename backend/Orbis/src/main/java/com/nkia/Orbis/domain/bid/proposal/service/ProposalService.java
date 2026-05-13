package com.nkia.Orbis.domain.bid.proposal.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ActivityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProposalErrorCode;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.activity.salesactivityrequest.repository.SalesActivityRequestRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.bid.proposal.dto.request.ProposalCreateRequest;
import com.nkia.Orbis.domain.bid.proposal.dto.request.ProposalUpdateRequest;
import com.nkia.Orbis.domain.bid.proposal.dto.response.ProposalDetailResponse;
import com.nkia.Orbis.domain.bid.proposal.dto.response.ProposalFileResponse;
import com.nkia.Orbis.domain.bid.proposal.dto.response.ProposalListResponse;
import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import com.nkia.Orbis.domain.bid.proposal.entity.ProposalStatus;
import com.nkia.Orbis.domain.bid.proposal.repository.ProposalRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import com.nkia.Orbis.domain.uploadfile.service.UploadFileService;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용 트랜잭션 적용
public class ProposalService {

    private final UploadFileService uploadFileService; // Presigned URL 발급용

    private final ProposalRepository proposalRepository;
    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final SalesActivityRequestRepository salesActivityRequestRepository;
    private final UploadFileRepository uploadFileRepository;
    private final UserRepository userRepository;

    /**
     * 1. 제안서 등록 (Create)
     */
    @Transactional
    public Long createProposal(ProposalCreateRequest request) {
        // [1] 중복 제안서 방어 로직 (1사업기회 = 1제안서)
        if (proposalRepository.existsByProjectOpportunityId(request.projectOpportunityId())) {
            throw new ApiException(ProposalErrorCode.PROPOSAL_ALREADY_EXISTS);
        }

        // [2] 연관 엔티티 조회
        ProjectOpportunity projectOpportunity = findProjectOpportunity(request);
        SalesActivityRequest salesActivityRequest = findSalesActivityRequest(request);

        // [3] 엔티티 생성
        Proposal proposal = makeProposal(projectOpportunity, salesActivityRequest);

        // [4] 파일 매핑 (프론트에서 업로드 후 넘겨준 ID 활용)
        if (request.fileIds() != null && !request.fileIds().isEmpty()) {
            List<UploadFile> files = uploadFileRepository.findAllById(request.fileIds());
            files.forEach(proposal::addFile);
        }

        Proposal savedProposal = proposalRepository.save(proposal);
        return savedProposal.getId(); // 생성 시에는 ID만 반환하여 불필요한 URL 생성 비용 절약
    }

    private ProjectOpportunity findProjectOpportunity(ProposalCreateRequest request) {
        return projectOpportunityRepository.findById(request.projectOpportunityId())
                .orElseThrow(() -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));
    }

    private SalesActivityRequest findSalesActivityRequest(ProposalCreateRequest request) {
        SalesActivityRequest salesActivityRequest = null;
        if (request.salesActivityRequestId() != null) {
            salesActivityRequest = salesActivityRequestRepository.findById(request.salesActivityRequestId())
                    .orElseThrow(() -> new ApiException(ActivityErrorCode.SALES_ACTIVITY_REQUEST_NOT_FOUND));
        }
        return salesActivityRequest;
    }

    private Proposal makeProposal(ProjectOpportunity projectOpportunity,
                                  SalesActivityRequest salesActivityRequest) {
        return Proposal.builder()
                .projectOpportunity(projectOpportunity)
                .salesActivityRequest(salesActivityRequest)
                .build();
    }

    /**
     * 2. 제안서 정보 수정 (Update)
     */
    @Transactional
    public Long updateProposal(Long id, ProposalUpdateRequest request) {
        Proposal proposal = findProposal(id);

        // [컬렉션 최적화] 파일 업데이트 로직
        // orphanRemoval = true 설정으로 인해 clear() 후 addAll() 하면 기존 매핑 정보가 삭제됨
        updateFiles(request, proposal);

        // 상태 변경 비즈니스 로직 위임 (엔티티 내부에 로직 캡슐화)
        completeProposal(request, proposal);

        return proposal.getId();
    }

    private void updateFiles(ProposalUpdateRequest request, Proposal proposal) {
        proposal.getFiles().clear();
        if (request.fileIds() != null && !request.fileIds().isEmpty()) {
            List<UploadFile> newFiles = uploadFileRepository.findAllById(request.fileIds());
            newFiles.forEach(proposal::addFile);
        }
    }

    private void completeProposal(ProposalUpdateRequest request, Proposal proposal) {
        if (request.status() != null && request.status() != proposal.getStatus()) {
            // "완료" 상태로 변경 시 파일이 있는지 검증하는 엔티티 내부 메서드 호출
            if (request.status() == ProposalStatus.COMPLETED) {
                proposal.submitProposal();
            }
        }
    }

    /**
     * 3. 제안서 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteProposal(Long id) {
        Proposal proposal = findProposal(id);
        proposal.delete(); // BaseEntity의 Soft Delete 메서드
    }

    /**
     * 4. 단건 상세 조회 (Read - Detail)
     */
    public ProposalDetailResponse getProposalDetail(Long id) {
        // [1] Repository에서 EntityGraph를 통해 연관 데이터 1번에 Fetch Join
        Proposal proposal = proposalRepository.findProposalDetailById(id)
                .orElseThrow(() -> new ApiException(ProposalErrorCode.PROPOSAL_NOT_FOUND));

        // [2] 작성자(Creator) 안전하게 조회
        User creator = getCreatorSafely(proposal);

        // [3] 파일 정보 + MinIO Presigned URL 동적 생성
        List<ProposalFileResponse> fileResponses = getProposalFileResponses(proposal);

        return ProposalDetailResponse.of(proposal, creator, fileResponses);
    }

    private @NonNull List<ProposalFileResponse> getProposalFileResponses(Proposal proposal) {
        return proposal.getFiles().stream()
                .map(file -> {
                    String presignedUrl = uploadFileService.getPresignedUrl(file.getId());
                    return ProposalFileResponse.of(file, presignedUrl);
                }).collect(Collectors.toList());
    }

    /**
     * 5. 목록 조회 (Read - List)
     */
    public Page<ProposalListResponse> getProposalList(Pageable pageable) {
        // Repository에서 EntityGraph를 통해 목록에 필요한 데이터만 얇게 Fetch Join
        Page<Proposal> proposalPage = proposalRepository.findProposalList(pageable);

        // 목록 조회용 DTO로 변환
        return proposalPage.map(ProposalListResponse::from);
    }

    // --- Private Helper Methods ---

    private Proposal findProposal(Long id) {
        return proposalRepository.findById(id)
                .orElseThrow(() -> new ApiException(ProposalErrorCode.PROPOSAL_NOT_FOUND));
    }

    private User getCreatorSafely(Proposal proposal) {
        String createdBy = proposal.getCreatedBy();
        if (createdBy == null || createdBy.isBlank()) {
            return null;
        }
        try {
            return userRepository.findById(UUID.fromString(createdBy)).orElse(null);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}