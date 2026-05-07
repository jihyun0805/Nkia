package com.nkia.Orbis.domain.projectopportunity.projectopportunity.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.repository.CompanyRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request.ProjectOpportunityCreateRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request.ProjectOpportunityUpdateRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response.ProjectOpportunityResponse;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용 트랜잭션 적용 (조회 성능 최적화)
public class ProjectOpportunityService {

    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final CompanyRepository companyRepository; // 신규 등록 시 고객사 조회를 위해 필요

    /**
     * 1. 사업 기회 등록 (Create)
     */
    @Transactional // 쓰기 작업이므로 트랜잭션 오버라이딩
    public ProjectOpportunityResponse createProjectOpportunity(ProjectOpportunityCreateRequest request) {
        // 중복 코드 방어 로직 (면접 어필 포인트)
        if (projectOpportunityRepository.existsByOpportunityCode(request.opportunityCode())) {
            throw new ApiException(ProjectOpportunityErrorCode.EXISTS_PROJECT_OPPORTUNITY_CODE);
        }

        // DTO에서 넘어온 ID로 실제 고객사 엔티티 조회
        Company customerCompany = companyRepository.findById(request.customerCompanyId())
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));

        // DTO 내부의 toEntity 메서드를 통해 엔티티 조립 (이전 단계에서 설계한 핵심 포인트!)
        ProjectOpportunity opportunity = request.toEntity(customerCompany);

        ProjectOpportunity savedOpportunity = projectOpportunityRepository.save(opportunity);

        return ProjectOpportunityResponse.from(savedOpportunity);
    }

    /**
     * 2. 사업 기회 정보 수정 (Update - 더티 체킹 활용)
     */
    @Transactional
    public ProjectOpportunityResponse updateProjectOpportunity(Long id, ProjectOpportunityUpdateRequest request) {
        ProjectOpportunity opportunity = findProjectOpportunity(id);

        // Repository save() 호출 없이, 엔티티의 비즈니스 메서드만 호출 (더티 체킹)
        updateProjectOpportunityInfo(request, opportunity);

        return ProjectOpportunityResponse.from(opportunity);
    }

    private void updateProjectOpportunityInfo(ProjectOpportunityUpdateRequest request,
                                              ProjectOpportunity opportunity) {
        opportunity.updateInformation(
                request.opportunityName(),
                request.stage(),
                request.projectType(),
                request.expectedBidDate(),
                request.expectedBudget(),
                request.description(),
                request.competitionStatus()
        );
    }

    /**
     * 3. 사업 기회 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteProjectOpportunity(Long id) {
        ProjectOpportunity opportunity = findProjectOpportunity(id);
        // 멘티님이 설계하신 Soft Delete 메서드 호출
        opportunity.delete();
    }

    /**
     * 4. 단건 상세 조회 (Read)
     */
    public ProjectOpportunityResponse getProjectOpportunity(Long id) {
        ProjectOpportunity opportunity = findProjectOpportunity(id);
        return ProjectOpportunityResponse.from(opportunity);
    }

    /**
     * 5. 목록 조회 (페이징 + 정렬)
     */
    public Page<ProjectOpportunityResponse> getProjectOpportunityList(Pageable pageable) {
        // Repository에서 Entity Page를 가져온 뒤, map()을 이용해 DTO Page로 깔끔하게 변환
        return projectOpportunityRepository.findAll(pageable)
                .map(ProjectOpportunityResponse::from);
    }

    private ProjectOpportunity findProjectOpportunity(Long id) {
        return projectOpportunityRepository.findById(id)
                .orElseThrow(() -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));
    }
}