package com.nkia.Orbis.domain.bid.rfpanalyzeresult.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.RfpAnalyzeErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request.RfpAnalyzeResultCreateRequest;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request.RfpAnalyzeResultUpdateRequest;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request.RfpRequirementRequest;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response.RfpAnalyzeResultDetailResponse;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response.RfpAnalyzeResultListResponse;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpRequirement;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.repository.RfpAnalyzeResultRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RfpAnalyzeResultService {

    private final RfpAnalyzeResultRepository rfpAnalyzeResultRepository;
    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final UserRepository userRepository;

    /**
     * 1. RFP 분석 결과 등록 (Create)
     */
    @Transactional
    public RfpAnalyzeResultDetailResponse createRfpAnalyzeResult(RfpAnalyzeResultCreateRequest request,
                                                                 UUID requestUserId) {
        ProjectOpportunity opportunity = getProjectOpportunity(request);
        User requestUser = findUser(requestUserId);
        User assignee = findUser(request.assigneeId());

        // 부모 엔티티 조립
        RfpAnalyzeResult rfpAnalyzeResult = request.toEntity(requestUser.getName(), assignee, opportunity);
        opportunity.assignRfpAnalyzeResult(rfpAnalyzeResult);

        // 자식 요구사항 엔티티 추가 (addRequirement 편의 메서드 활용)
        if (request.requirements() != null) {
            for (RfpRequirementRequest req : request.requirements()) {
                rfpAnalyzeResult.addRequirement(req.toEntity());
            }
        }

        RfpAnalyzeResult savedResult = rfpAnalyzeResultRepository.save(rfpAnalyzeResult);
        return RfpAnalyzeResultDetailResponse.from(savedResult);
    }

    private ProjectOpportunity getProjectOpportunity(RfpAnalyzeResultCreateRequest request) {
        ProjectOpportunity opportunity = findProjectOpportunity(request.projectOpportunityId());
        if (opportunity.getRfpAnalyzeResult() != null) {
            throw new ApiException(RfpAnalyzeErrorCode.RFP_ALREADY_EXISTS);
        }
        return opportunity;
    }

    /**
     * 2. RFP 분석 결과 수정 (Update - 부모 및 자식 컬렉션 병합)
     */
    @Transactional
    public RfpAnalyzeResultDetailResponse updateRfpAnalyzeResult(Long id,
                                                                 RfpAnalyzeResultUpdateRequest request) {
        RfpAnalyzeResult rfpAnalyzeResult = findRfpAnalyzeResult(id);
        User assignee = findUser(request.assigneeId());
        ProjectOpportunity projectOpportunity = findProjectOpportunity(request.projectOpportunityId());

        // 1. 부모 엔티티 기본 정보 업데이트 (더티 체킹)
        updateRfpAnalyzeResultInfo(request, rfpAnalyzeResult, assignee, projectOpportunity);

        // 2. 자식 컬렉션(Requirements) 스마트 업데이트 (고아 객체 제거 + 더티 체킹 활용)
        updateRequirements(rfpAnalyzeResult, request.requirements());

        return RfpAnalyzeResultDetailResponse.from(rfpAnalyzeResult);
    }

    private void updateRfpAnalyzeResultInfo(RfpAnalyzeResultUpdateRequest request, RfpAnalyzeResult rfpAnalyzeResult,
                                            User assignee, ProjectOpportunity projectOpportunity) {
        rfpAnalyzeResult.update(request.hardwareProvider(), request.budgetAmount(), request.expectedDuration(),
                request.projectLocation(), request.proposalDeadline(), request.projectDescription(),
                request.proposalType(), assignee, projectOpportunity);
    }

    /**
     * 💡 핵심 로직: 요구사항 컬렉션 병합(Merge) 알고리즘
     */
    // 요구 사항 업데이트
    private void updateRequirements(RfpAnalyzeResult rfpAnalyzeResult,
                                    List<RfpRequirementRequest> requestRequirements) {
        if (requestRequirements == null) {
            return;
        }

        Map<Long, RfpRequirement> existingMap = getExistingRequirementsMap(rfpAnalyzeResult);
        Set<Long> requestedIds = getRequestedIds(requestRequirements);

        // 1. 요청에 없는 기존 엔티티 삭제 (고아 객체 제거 유도)
        removeDeletedRequirements(rfpAnalyzeResult, requestedIds);

        // 2. 신규 추가 및 기존 엔티티 수정 (Upsert)
        updateAndInsertRequirements(rfpAnalyzeResult, requestRequirements, existingMap);
    }

    // 기존에 있던 요구 사항 Map 형태로 만듬
    private Map<Long, RfpRequirement> getExistingRequirementsMap(RfpAnalyzeResult rfpAnalyzeResult) {
        return rfpAnalyzeResult.getRequirements()
                .stream()
                .collect(Collectors.toMap(RfpRequirement::getId, Function.identity()));
    }

    // 요청에서 넘어온 요구사항 중 id가 null이 아닌 것 = 새로 생긴 것이 아니라 기존에 있던 것을 set으로 만듬
    private Set<Long> getRequestedIds(List<RfpRequirementRequest> requestRequirements) {
        return requestRequirements.stream()
                .map(RfpRequirementRequest::id)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    // 기존에 있던 요구사항 중 요청에서 넘어온 요구사항에 없는 것들 List에서 제거
    private void removeDeletedRequirements(RfpAnalyzeResult rfpAnalyzeResult,
                                           Set<Long> requestedIds) {
        rfpAnalyzeResult.getRequirements().removeIf(req -> !requestedIds.contains(req.getId()));
    }

    // 요청에서 넘어온 요구사항에서 id가 null인 것 = 새로 생긴 것은 insert
    // id가 있다면 = 기존에 있던 것은 update
    private void updateAndInsertRequirements(RfpAnalyzeResult rfpAnalyzeResult,
                                             List<RfpRequirementRequest> requestRequirements,
                                             Map<Long, RfpRequirement> existingMap) {
        for (RfpRequirementRequest reqDto : requestRequirements) {
            if (reqDto.id() == null) {
                // ID가 없으면 신규 객체 생성 및 추가
                rfpAnalyzeResult.addRequirement(reqDto.toEntity());
            } else {
                // ID가 있으면 기존 객체 더티 체킹 유도
                RfpRequirement existingReq = existingMap.get(reqDto.id());
                if (existingReq != null) {
                    existingReq.update(reqDto.category(), reqDto.requirementCode(), reqDto.name(),
                            reqDto.description(), reqDto.supportType(), reqDto.reviewComment(), reqDto.effort());
                }
            }
        }
    }

    /**
     * 3. 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteRfpAnalyzeResult(Long id) {
        RfpAnalyzeResult rfpAnalyzeResult = findRfpAnalyzeResult(id);
        rfpAnalyzeResult.delete();
        rfpAnalyzeResult.getRequirements().forEach(RfpRequirement::delete);
    }

    /**
     * 4. 단건 상세 조회 (N+1 최적화 적용됨)
     */
    public RfpAnalyzeResultDetailResponse getRfpAnalyzeResult(Long id) {
        RfpAnalyzeResult rfpAnalyzeResult = findRfpAnalyzeResult(id);
        return RfpAnalyzeResultDetailResponse.from(rfpAnalyzeResult);
    }

    /**
     * 5. 목록 조회 (N+1 최적화 및 Null Safe 매핑)
     */
    public Page<RfpAnalyzeResultListResponse> getRfpAnalyzeResultList(Pageable pageable) {
        Page<RfpAnalyzeResult> page = rfpAnalyzeResultRepository.findAll(pageable);

        // 1. 맵 생성 로직을 프라이빗 메서드로 위임
        Map<UUID, User> creatorMap = getCreatorMap(page);

        // 2. 매핑 로직을 프라이빗 메서드로 위임
        return page.map(rfp -> convertToListResponse(rfp, creatorMap));
    }

    // --- 분리된 Helper Methods ---
    // set으로 만든 작성자들 UUID를 가져와 repository에서 User들 가져오고 Map으로 만듬
    private Map<UUID, User> getCreatorMap(Page<RfpAnalyzeResult> page) {
        Set<UUID> creatorIds = getCreatorIds(page);

        // 최적화: 추출된 작성자 ID가 없으면 빈 맵을 반환하여 불필요한 DB 쿼리 방지
        if (creatorIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(creatorIds)
                .stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    // RFP와 Map을 가져와서 RFP 생성한 user id 가져와서 Map에서 User 찾아옴
    // 그리고 RFP와 User로 response dto 만듬
    private RfpAnalyzeResultListResponse convertToListResponse(RfpAnalyzeResult rfp,
                                                               Map<UUID, User> creatorMap) {
        User creator = null;
        String createdBy = rfp.getCreatedBy();

        if (createdBy != null && !createdBy.isBlank()) {
            try {
                // UUID 변환 시 발생할 수 있는 포맷 예외 안전하게 처리
                creator = creatorMap.get(UUID.fromString(createdBy));
            } catch (IllegalArgumentException e) {
                creator = null; // UUID 형식이 아닌 잘못된 값이 들어있을 경우 방어
            }
        }
        return RfpAnalyzeResultListResponse.from(rfp, creator);
    }

    // --- Helper Methods ---

    // 가져온 RFP 분석 결과에서 작성자 ID들 set으로 만듬
    private Set<UUID> getCreatorIds(Page<RfpAnalyzeResult> page) {
        return page.getContent()
                .stream()
                .map(RfpAnalyzeResult::getCreatedBy)
                .filter(createdBy -> createdBy != null && !createdBy.isBlank())
                .map(UUID::fromString)
                .collect(Collectors.toSet());
    }

    private ProjectOpportunity findProjectOpportunity(Long projectOpportunityId) {
        return projectOpportunityRepository.findById(projectOpportunityId)
                .orElseThrow(
                        () -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    private RfpAnalyzeResult findRfpAnalyzeResult(Long id) {
        return rfpAnalyzeResultRepository.findById(id)
                .orElseThrow(
                        () -> new ApiException(RfpAnalyzeErrorCode.RFP_ANALYZE_NOT_FOUND)); // 예외 코드 추가 필요
    }
}
