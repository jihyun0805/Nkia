package com.nkia.Orbis.domain.projectopportunity.projectopportunity.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.repository.CompanyRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request.ProjectOpportunityCreateRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.request.ProjectOpportunityUpdateRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response.ProjectOpportunityResponse;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import java.util.List;
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
@Transactional(readOnly = true) // 기본적으로 읽기 전용 트랜잭션 적용 (조회 성능 최적화)
public class ProjectOpportunityService {

    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final CompanyRepository companyRepository; // 신규 등록 시 고객사 조회를 위해 필요
    private final UserRepository userRepository;
    private final ProductModuleRepository productModuleRepository;
    private final UploadFileRepository uploadFileRepository;

    /**
     * 1. 사업 기회 등록 (Create)
     */
    @Transactional // 쓰기 작업이므로 트랜잭션 오버라이딩
    public ProjectOpportunityResponse createProjectOpportunity(ProjectOpportunityCreateRequest request) {
        // 중복 코드 방어 로직 (면접 어필 포인트)
        checkProjectOpportunityCode(request);

        // DTO에서 넘어온 ID로 실제 고객사 엔티티 조회
        Company customerCompany = findCustomerCompany(request);
        User salesRepresentative = findUser(request.salesRepresentativeId());

        // DTO 내부의 toEntity 메서드를 통해 엔티티 조립 (이전 단계에서 설계한 핵심 포인트!)
        ProjectOpportunity opportunity = request.toEntity(customerCompany, salesRepresentative);

        // 첨부파일(RFP), 협력사, 납품 모듈 매핑
        mappingRfpFiles(request, opportunity);
        mappingPartnerCompanies(request, opportunity);
        mappingProductModules(request, opportunity);

        ProjectOpportunity savedOpportunity = projectOpportunityRepository.save(opportunity);
        User createUser = getCreatorSafely(savedOpportunity);

        return ProjectOpportunityResponse.from(savedOpportunity, createUser);
    }

    private void checkProjectOpportunityCode(ProjectOpportunityCreateRequest request) {
        if (projectOpportunityRepository.existsByOpportunityCode(request.opportunityCode())) {
            throw new ApiException(ProjectOpportunityErrorCode.EXISTS_PROJECT_OPPORTUNITY_CODE);
        }
    }

    private Company findCustomerCompany(ProjectOpportunityCreateRequest request) {
        return companyRepository.findById(request.customerCompanyId())
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));
    }

    private void mappingRfpFiles(ProjectOpportunityCreateRequest request, ProjectOpportunity opportunity) {
        if (request.rfpFileIds() != null && !request.rfpFileIds().isEmpty()) {
            List<UploadFile> files = uploadFileRepository.findAllById(request.rfpFileIds());
            opportunity.addRfpFiles(files);
        }
    }

    private void mappingPartnerCompanies(ProjectOpportunityCreateRequest request, ProjectOpportunity opportunity) {
        if (request.partnerCompanyIds() != null && !request.partnerCompanyIds().isEmpty()) {
            List<Company> partnerCompanies = companyRepository.findAllById(request.partnerCompanyIds());
            partnerCompanies.forEach(opportunity::addPartnerCompany);
        }
    }

    private void mappingProductModules(ProjectOpportunityCreateRequest request, ProjectOpportunity opportunity) {
        if (request.productModuleIds() != null && !request.productModuleIds().isEmpty()) {
            List<ProductModule> productModules = productModuleRepository.findAllById(request.productModuleIds());
            productModules.forEach(opportunity::addProductModule);
        }
    }

    /**
     * 2. 사업 기회 정보 수정 (Update - 더티 체킹 활용)
     */
    @Transactional
    public ProjectOpportunityResponse updateProjectOpportunity(Long id, ProjectOpportunityUpdateRequest request) {
        ProjectOpportunity opportunity = findProjectOpportunity(id);
        // Repository save() 호출 없이, 엔티티의 비즈니스 메서드만 호출 (더티 체킹)
        updateProjectOpportunityInfo(request, opportunity);
        updatingRfpFiles(request, opportunity);
        updatingPartnerCompanies(request, opportunity);
        updatingProductModules(request, opportunity);
        User createUser = getCreatorSafely(opportunity);
        return ProjectOpportunityResponse.from(opportunity, createUser);
    }

    private void updateProjectOpportunityInfo(ProjectOpportunityUpdateRequest request,
                                              ProjectOpportunity opportunity) {
        User salesRepresentative = findUser(request.salesRepresentativeId());
        Company customerCompany = companyRepository.findById(request.customerCompanyId())
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));
        opportunity.updateInformation(
                request.opportunityName(),
                request.stage(),
                request.projectType(),
                request.expectedBidDate(),
                request.expectedBudget(),
                request.description(),
                request.competitionStatus(),
                salesRepresentative,
                customerCompany
        );
    }

    private void updatingRfpFiles(ProjectOpportunityUpdateRequest request, ProjectOpportunity opportunity) {
        List<Long> fileIds = request.rfpFileIds();
        if (fileIds != null && !fileIds.isEmpty()) {
            List<UploadFile> files = uploadFileRepository.findAllById(fileIds);
            // 방어 로직: 전달된 ID 개수와 조회된 파일 개수가 다르면 예외 발생
            if (files.size() != fileIds.size()) {
                throw new IllegalArgumentException("요청한 파일 중 일부를 찾을 수 없습니다."); // 적절한 ApiException으로 교체 권장
            }
            opportunity.updateRfpFiles(files);
        } else {
            opportunity.updateRfpFiles(null); // 비우기 요청 처리
        }
    }

    private void updatingPartnerCompanies(ProjectOpportunityUpdateRequest request, ProjectOpportunity opportunity) {
        List<Long> companyIds = request.partnerCompanyIds();
        if (companyIds != null && !companyIds.isEmpty()) {
            List<Company> partnerCompanies = companyRepository.findAllById(companyIds);
            if (partnerCompanies.size() != companyIds.size()) {
                throw new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND);
            }
            opportunity.updatePartnerCompanies(partnerCompanies);
        } else {
            opportunity.updatePartnerCompanies(null);
        }
    }

    private void updatingProductModules(ProjectOpportunityUpdateRequest request, ProjectOpportunity opportunity) {
        List<Long> moduleIds = request.productModuleIds();
        if (moduleIds != null && !moduleIds.isEmpty()) {
            List<ProductModule> productModules = productModuleRepository.findAllById(moduleIds);
            if (productModules.size() != moduleIds.size()) {
                throw new IllegalArgumentException("요청한 모듈 중 일부를 찾을 수 없습니다."); // 적절한 ApiException으로 교체 권장
            }
            opportunity.updateProductModules(productModules);
        } else {
            opportunity.updateProductModules(null);
        }
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
        User createUser = getCreatorSafely(opportunity);
        return ProjectOpportunityResponse.from(opportunity, createUser);
    }

    /**
     * 5. 목록 조회 (페이징 + 정렬)
     */
    public Page<ProjectOpportunityResponse> getProjectOpportunityList(Pageable pageable) {
        Page<ProjectOpportunity> page = projectOpportunityRepository.findAll(pageable);
        return mapToResponsePage(page);
    }

    // 특정 고객사의 사업 기회 목록 조회
    public Page<ProjectOpportunityResponse> getProjectOpportunitiesByCustomer(Long companyId, Pageable pageable) {
        // 고객사가 존재하는지 먼저 검증 (선택사항이나 방어적으로 추가하면 좋습니다)
        if (!companyRepository.existsById(companyId)) {
            throw new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND);
        }

        Page<ProjectOpportunity> page = projectOpportunityRepository.findAllByCustomerCompanyId(companyId, pageable);
        return mapToResponsePage(page); // 기존에 분리해 둔 맵핑 메서드 재사용
    }

    // 중복 코드 제거를 위해 DTO 맵핑 로직을 별도 메서드로 분리 (리팩토링)
    private Page<ProjectOpportunityResponse> mapToResponsePage(Page<ProjectOpportunity> page) {
        Set<UUID> creatorIds = getCreatorIds(page);

        Map<UUID, User> creatorMap = userRepository.findAllById(creatorIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return page.map(opportunity -> {
            User creator = null;
            if (opportunity.getCreatedBy() != null && !opportunity.getCreatedBy().isBlank()) {
                creator = creatorMap.get(UUID.fromString(opportunity.getCreatedBy()));
            }
            return ProjectOpportunityResponse.from(opportunity, creator);
        });
    }

    private Set<UUID> getCreatorIds(Page<ProjectOpportunity> page) {
        return page.getContent()
                .stream()
                .map(ProjectOpportunity::getCreatedBy)
                .filter(createdBy -> createdBy != null && !createdBy.isBlank())
                .map(UUID::fromString)
                .collect(Collectors.toSet());
    }

    private User getCreatorSafely(ProjectOpportunity opportunity) {
        String createdBy = opportunity.getCreatedBy();
        if (createdBy == null || createdBy.isBlank()) {
            return null; // Audit 미작동 또는 레거시 데이터 방어
        }
        try {
            // 작성자 계정이 물리적 삭제되었을 경우 예외를 던지지 않고 null 반환 (화면에서 '알 수 없음' 처리)
            return userRepository.findById(UUID.fromString(createdBy)).orElse(null);
        } catch (IllegalArgumentException e) {
            return null; // UUID 파싱 실패 방어
        }
    }

    private User findUser(UUID userid) {
        return userRepository.findById(userid)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));
    }

    private ProjectOpportunity findProjectOpportunity(Long id) {
        return projectOpportunityRepository.findById(id)
                .orElseThrow(() -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));
    }
}
