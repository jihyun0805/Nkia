package com.nkia.Orbis.domain.bid.bidresult.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.BidResultErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProposalErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.bid.bidresult.dto.request.BidResultCreateRequest;
import com.nkia.Orbis.domain.bid.bidresult.dto.request.BidResultUpdateRequest;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultDetailResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultHistoryListResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultHistoryResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.response.BidResultListResponse;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.CompanyScoreDto;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.WinLossAnalysisDto;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResultHistory;
import com.nkia.Orbis.domain.bid.bidresult.repository.BidResultHistoryRepository;
import com.nkia.Orbis.domain.bid.bidresult.repository.BidResultRepository;
import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import com.nkia.Orbis.domain.bid.proposal.repository.ProposalRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용 트랜잭션 적용 (조회 성능 최적화)
public class BidResultService {

    private final BidResultRepository bidResultRepository;
    private final BidResultHistoryRepository bidResultHistoryRepository;
    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final ProposalRepository proposalRepository;
    private final UserRepository userRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowService workflowService;

    /**
     * 1. 입찰 결과 등록 (Create)
     */
    @Transactional
    public Long createBidResult(BidResultCreateRequest request) {
        // 1. 연관 엔티티 조회 (필수)
        ProjectOpportunity opportunity = findProjectOpportunity(request.getProjectOpportunityId());
        User salesRepresentative = findUser(request.getSalesRepresentativeId());

        // 2. 연관 엔티티 조회 (선택적 Null 허용 필드) - 재사용 가능한 헬퍼 메서드 사용
        User projectManager = findProjectManagerOrNull(request.getProjectManagerId());
        Proposal proposal = findProposalOrNull(request.getProposalId());

        // 3. 1:1 관계 중복 검증 (한 사업기회당 하나의 입찰결과만 존재)
        checkOneBidResult(opportunity);

        // 4. DTO 내부의 toEntity를 통한 생성 및 데이터 매핑
        BidResult bidResult = request.toEntity(opportunity, proposal, salesRepresentative, projectManager);

        // 5. 영속화
        return bidResultRepository.save(bidResult).getId();
    }

    /**
     * 2. 입찰 결과 수정 (Update - 더티 체킹 적용)
     */
    @Transactional
    public void updateBidResult(Long id, BidResultUpdateRequest request) {
        // 1. 기존 입찰 결과 엔티티 조회
        BidResult bidResult = findBidResult(id);

        saveSnapshot(bidResult);

        // 2. 변경될 연관 엔티티들 조회
        ProjectOpportunity opportunity = findOpportunity(request, bidResult);
        User salesRepresentative = findUser(request.getSalesRepresentativeId());
        User projectManager = findProjectManagerOrNull(request.getProjectManagerId());
        Proposal proposal = findProposalOrNull(request.getProposalId());

        // 3. 엔티티 내부 비즈니스 메서드를 호출하여 상태 변경 (Dirty Checking)
        // 3-1. 연관 관계 업데이트
        bidResult.updateAssociations(opportunity, proposal, salesRepresentative, projectManager);
        updateBidResultInfo(request, bidResult);

        // 4. VO 객체 및 컬렉션 업데이트
        updateBidResultValueObject(request, bidResult);
    }

    private ProjectOpportunity findOpportunity(BidResultUpdateRequest request, BidResult bidResult) {
        ProjectOpportunity opportunity = findProjectOpportunity(request.getProjectOpportunityId());
        if (!bidResult.getProjectOpportunity().getId().equals(opportunity.getId())) {
            checkOneBidResult(opportunity);
        }
        return opportunity;
    }

    private void saveSnapshot(BidResult bidResult) {
        long historyCount = bidResultHistoryRepository.countByBidResultId(bidResult.getId());
        Integer nextVersion = (int) historyCount + 1;

        BidResultHistory history = BidResultHistory.createSnapshot(bidResult, nextVersion);
        bidResultHistoryRepository.save(history);
    }

    private void updateBidResultInfo(BidResultUpdateRequest request, BidResult bidResult) {
        // 3-2. 입찰 기본 및 일정 정보 업데이트
        updateBidDetails(request, bidResult);

        // 3-3. 제안 전략 및 이슈 업데이트
        updateStrategies(request, bidResult);

        // 3-4. 입찰 결과 및 공개 상태 업데이트
        updateOutcomes(request, bidResult);
    }

    private void updateBidDetails(BidResultUpdateRequest request, BidResult bidResult) {
        bidResult.updateBidDetails(
                request.getBudget(),
                request.getIsExternalPdInvolved(),
                request.getBidAnnouncementDate()
        );
    }

    private void updateStrategies(BidResultUpdateRequest request, BidResult bidResult) {
        bidResult.updateStrategies(
                request.getKeySuccessFactors(),
                request.getRfpIssues(),
                request.getProposalStrategy()
        );
    }

    private void updateOutcomes(BidResultUpdateRequest request, BidResult bidResult) {
        bidResult.updateOutcomes(
                request.getBidOutcome(),
                request.getDisclosureStatus()
        );
    }

    private void updateBidResultValueObject(BidResultUpdateRequest request, BidResult bidResult) {
        bidResult.updateOurCompanyScore(request.getOurCompanyScore().toValueObject());

        bidResult.updateCompetitorScores(
                request.getCompetitorScores().stream().map(CompanyScoreDto::toValueObject).toList());

        bidResult.updateAnalyses(
                request.getAnalyses().stream().map(WinLossAnalysisDto::toValueObject).toList());
    }

    /**
     * 3. 입찰 결과 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteBidResult(Long id) {
        BidResult bidResult = findBidResult(id);
        bidResult.delete(); // BaseEntity의 삭제 메서드 호출
    }

    /**
     * 4. 단건 상세 조회 (Read)
     */
    public BidResultDetailResponse getBidResultDetail(Long id) {
        BidResult bidResult = bidResultRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ApiException(BidResultErrorCode.BID_RESULT_NOT_FOUND));

        // 제안서 작성자 이름 추출 로직 (BaseEntity의 createdBy가 UUID 문자열로 저장된다고 가정)
        String proposalCreatorName = null;
        if (bidResult.getProposal() != null && bidResult.getProposal().getCreatedBy() != null) {
            proposalCreatorName = getCreatorName(bidResult.getProposal().getCreatedBy());
        }

        return BidResultDetailResponse.of(bidResult, proposalCreatorName, getWorkflowId(bidResult.getId()));
    }

    /**
     * 5. 목록 조회 (페이징)
     */
    public Page<BidResultListResponse> getBidResultList(Pageable pageable) {
        return bidResultRepository.findAll(pageable).map(BidResultListResponse::from);
    }

    /**
     * 6. 입찰 결과 변경 이력 목록 조회 (최신순)
     */
    public List<BidResultHistoryListResponse> getBidResultHistories(Long bidResultId) {
        findBidResult(bidResultId); // 원본 존재 검증
        List<BidResultHistory> histories = bidResultHistoryRepository.findByBidResultIdOrderByVersionDesc(bidResultId);
        return histories.stream()
                .map(BidResultHistoryListResponse::from)
                .toList();
    }

    /**
     * 7. 특정 과거 버전의 입찰 결과 스냅샷 상세 단건 조회
     */
    public BidResultHistoryResponse getBidResultHistoryDetail(Long historyId) {
        BidResultHistory history = bidResultHistoryRepository.findWithDetailsById(historyId)
                .orElseThrow(() -> new ApiException(BidResultErrorCode.BID_RESULT_NOT_FOUND));

        String creatorName = getCreatorName(history.getCreatedBy());

        return BidResultHistoryResponse.of(history, creatorName);
    }

    // ==========================================
    // Private Helper Methods
    // ==========================================

    private User findProjectManagerOrNull(UUID pmId) {
        return pmId != null ? findUser(pmId) : null;
    }

    private Proposal findProposalOrNull(Long proposalId) {
        return proposalId != null ? findProposal(proposalId) : null;
    }

    private void checkOneBidResult(ProjectOpportunity opportunity) {
        if (opportunity.getBidResult() != null) {
            throw new ApiException(BidResultErrorCode.BID_RESULT_ALREADY_EXISTS);
        }
    }

    private BidResult findBidResult(Long id) {
        return bidResultRepository.findById(id)
                .orElseThrow(() -> new ApiException(BidResultErrorCode.BID_RESULT_NOT_FOUND));
    }

    private ProjectOpportunity findProjectOpportunity(Long id) {
        return projectOpportunityRepository.findById(id)
                .orElseThrow(() -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));
    }

    private Proposal findProposal(Long id) {
        return proposalRepository.findById(id)
                .orElseThrow(() -> new ApiException(ProposalErrorCode.PROPOSAL_NOT_FOUND)); // 에러코드 가정
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    private String getCreatorName(String createdByIdStr) {
        try {
            UUID creatorId = UUID.fromString(createdByIdStr);
            return userRepository.findById(creatorId).map(User::getName).orElse("알 수 없음");
        } catch (IllegalArgumentException e) {
            return "시스템"; // UUID 파싱 실패 시 기본값
        }
    }

    @Transactional
    public void submitBidResult(
            Long bidResultId,
            UUID firstApproverId
    ) {
        BidResult bidResult = bidResultRepository.findById(bidResultId)
                .orElseThrow(() -> new ApiException(BidResultErrorCode.BID_RESULT_NOT_FOUND));

        if (!bidResult.isDraft()) {
            throw new ApiException(BidResultErrorCode.INVALID_BID_RESULT_STATUS);
        }

        UUID requesterId = UUID.fromString(SecurityUtil.getCurrentUserId());

        Workflow workflow = workflowService.startWorkflow(
                WorkflowDomain.BID_RESULT,
                bidResult.getId(),
                requesterId,
                firstApproverId
        );

        bidResult.submit();
    }

    private Long getWorkflowId(Long bidResultId) {

        return workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        WorkflowDomain.BID_RESULT,
                        bidResultId,
                        WorkflowStatus.IN_PROGRESS
                )
                .map(Workflow::getId)
                .orElse(null);
    }
}