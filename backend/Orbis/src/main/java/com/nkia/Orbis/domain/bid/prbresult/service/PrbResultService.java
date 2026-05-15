package com.nkia.Orbis.domain.bid.prbresult.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.PrbErrorCode;
import com.nkia.Orbis.common.exception.errorcode.PrbResultErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.bid.prb.repository.PrbRepository;
import com.nkia.Orbis.domain.bid.prbresult.dto.request.PrbResultAttendeeOpinionRequest;
import com.nkia.Orbis.domain.bid.prbresult.dto.request.PrbResultCreateRequest;
import com.nkia.Orbis.domain.bid.prbresult.dto.request.PrbResultUpdateRequest;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultListResponse;
import com.nkia.Orbis.domain.bid.prbresult.dto.response.PrbResultResponse;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResultAttendeeOpinion;
import com.nkia.Orbis.domain.bid.prbresult.repository.PrbResultRepository;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PrbResultService {

    private final PrbResultRepository prbResultRepository;
    private final PrbRepository prbRepository;
    private final UserRepository userRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowService workflowService;

    /**
     * 1. PRB 결과 등록
     */
    @Transactional
    public PrbResultResponse createPrbResult(PrbResultCreateRequest request) {
        Prb prb = prbRepository.findById(request.prbId())
                .orElseThrow(() -> new ApiException(
                        ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));

        PrbResult prbResult = request.toEntity(prb);
        PrbResult savedResult = prbResultRepository.save(prbResult);

        return getPrbResultResponse(savedResult);
    }

    /**
     * 2. PRB 결과 상세 조회
     */
    public PrbResultResponse getPrbResult(Long id) {
        PrbResult prbResult = findPrbResult(id);
        return getPrbResultResponse(prbResult);
    }

    /**
     * 3. PRB 결과 목록 조회 (페이징)
     */
    public Page<PrbResultListResponse> getPrbResultList(Pageable pageable) {
        Page<PrbResult> page = prbResultRepository.findAll(pageable);

        // 작성자(createdBy) 정보 배치를 위한 ID 추출
        Set<UUID> creatorIds = getCreatorIds(page);

        Map<UUID, User> creatorMap = userRepository.findAllById(creatorIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return page.map(result -> {
            User creator =
                    (result.getCreatedBy() != null) ? creatorMap.get(UUID.fromString(result.getCreatedBy())) : null;
            return PrbResultListResponse.of(result, creator);
        });
    }

    private Set<UUID> getCreatorIds(Page<PrbResult> page) {
        return page.getContent().stream()
                .map(PrbResult::getCreatedBy)
                .filter(id -> id != null && !id.isBlank())
                .map(UUID::fromString)
                .collect(Collectors.toSet());
    }

    /**
     * 4. PRB 결과 정보 수정
     */
    @Transactional
    public PrbResultResponse updatePrbResult(Long id, PrbResultUpdateRequest request) {
        PrbResult prbResult = findPrbResult(id);

        // 더티 체킹 활용: 필드 업데이트 및 값 타입 컬렉션 갱신
        updatePrbResultInfos(request, prbResult);

        // 참석자 의견(ElementCollection) 갱신: 기존 리스트를 비우고 새로 추가 (JPA의 컬렉션 관리 방식)
        prbResult.getAttendeeOpinions().clear();
        if (request.attendeeOpinions() != null) {
            request.attendeeOpinions().stream()
                    .map(PrbResultAttendeeOpinionRequest::toValueObject)
                    .forEach(prbResult::addAttendeeOpinion);
        }

        return getPrbResultResponse(prbResult);
    }

    private void updatePrbResultInfos(PrbResultUpdateRequest request, PrbResult prbResult) {
        prbResult.updateInformation(
                request.riskFactors(),
                request.comprehensiveOpinion(),
                request.meetingLocation(),
                request.meetingDateTime()
        );
    }

    /**
     * 5. PRB 결과 삭제 (Soft Delete)
     */
    @Transactional
    public void deletePrbResult(Long id) {
        PrbResult prbResult = findPrbResult(id);
        prbResult.delete(); // BaseEntity에 정의된 soft delete 메서드 호출
    }

    // --- 내부 헬퍼 메서드 ---

    private PrbResult findPrbResult(Long id) {
        return prbResultRepository.findById(id)
                .orElseThrow(() -> new ApiException(PrbErrorCode.PRB_NOT_FOUND));
    }

    /**
     * 상세 응답 DTO 조립 (작성자 + 모든 참석자 이름 조회를 위해 Batch 처리)
     */
    private PrbResultResponse getPrbResultResponse(PrbResult prbResult) {
        // 1. 작성자 조회
        User creator = null;
        if (prbResult.getCreatedBy() != null && !prbResult.getCreatedBy().isBlank()) {
            creator = userRepository.findById(UUID.fromString(prbResult.getCreatedBy())).orElse(null);
        }

        // 2. 참석자 의견에 포함된 모든 User ID 추출 후 일괄 조회 (N+1 방지)
        Set<UUID> attendeeIds = prbResult.getAttendeeOpinions().stream()
                .map(PrbResultAttendeeOpinion::getAttendeeUserId)
                .collect(Collectors.toSet());

        Map<UUID, User> attendeeMap = userRepository.findAllById(attendeeIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return PrbResultResponse.of(prbResult, creator, attendeeMap, getWorkflowId(prbResult.getId()));
    }

    @Transactional
    public void submitPrbResult(
            Long prbResultId,
            UUID firstApproverId
    ) {
        PrbResult prbResult = prbResultRepository.findById(prbResultId)
                .orElseThrow(() -> new ApiException(PrbResultErrorCode.PRB_RESULT_NOT_FOUND));

        if (!prbResult.isDraft()) {
            throw new ApiException(PrbResultErrorCode.INVALID_PRB_RESULT_STATUS);
        }

        UUID requesterId = UUID.fromString(SecurityUtil.getCurrentUserId());

        Workflow workflow = workflowService.startWorkflow(
                WorkflowDomain.PRB_RESULT,
                prbResult.getId(),
                requesterId,
                firstApproverId
        );

        prbResult.submit();
    }

    private Long getWorkflowId(Long prbResultId) {

        return workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        WorkflowDomain.PRB_RESULT,
                        prbResultId,
                        WorkflowStatus.IN_PROGRESS
                )
                .map(Workflow::getId)
                .orElse(null);
    }
}