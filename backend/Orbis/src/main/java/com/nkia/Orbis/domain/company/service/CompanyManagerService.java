package com.nkia.Orbis.domain.company.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.common.exception.errorcode.CompanyManagerErrorCode;
import com.nkia.Orbis.domain.company.dto.request.CompanyManagerCreateRequest;
import com.nkia.Orbis.domain.company.dto.request.CompanyManagerUpdateRequest;
import com.nkia.Orbis.domain.company.dto.response.CompanyManagerResponse;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyManager;
import com.nkia.Orbis.domain.company.repository.CompanyManagerRepository;
import com.nkia.Orbis.domain.company.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용으로 설정하여 성능 최적화
public class CompanyManagerService {

    private final CompanyManagerRepository companyManagerRepository;
    private final CompanyRepository companyRepository;

    /**
     * 담당자 등록 (Create)
     */
    @Transactional // 쓰기 작업이므로 트랜잭션 활성화
    public Long createManager(CompanyManagerCreateRequest request) {
        // 1. Fail-Fast: 이메일 중복 검증
        if (companyManagerRepository.existsByEmail(request.email())) {
            throw new ApiException(CompanyManagerErrorCode.COMPANY_MANAGER_EXISTS_EMAIL);
        }

        // 2. 연관된 회사(Company) 조회
        Company company = companyRepository.findById(request.companyId())
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));

        // 3. DTO -> Entity 변환 및 저장
        CompanyManager manager = request.toEntity(company);
        CompanyManager savedManager = companyManagerRepository.save(manager);

        log.info("새로운 담당자가 등록되었습니다. ManagerID: {}", savedManager.getId());
        return savedManager.getId();
    }

    /**
     * 담당자 수정 (Update)
     */
    @Transactional
    public void updateManager(Long managerId, CompanyManagerUpdateRequest request) {
        // 1. 영속성 컨텍스트에서 담당자 엔티티 조회
        CompanyManager manager = getCompanyManager(managerId);

        // 2. 엔티티 내부의 비즈니스 메서드 호출 (객체 지향적 수정)
        applyUpdateRequest(request, manager);

        // JPA Dirty Checking(변경 감지)이 작동하므로 companyManagerRepository.save(manager) 호출 불필요
        log.info("담당자 정보가 수정되었습니다. ManagerID: {}", managerId);
    }

    private void applyUpdateRequest(CompanyManagerUpdateRequest request, CompanyManager manager) {
        manager.updateInfo(
                request.name(),
                request.mobilePhone(),
                request.officePhone(),
                request.department(),
                request.position(),
                request.role()
        );
    }

    /**
     * 담당자 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteManager(Long managerId) {
        // 1. 엔티티 조회
        CompanyManager manager = getCompanyManager(managerId);

        // 2. BaseEntity에 정의해둔 Soft Delete 로직 호출
        manager.delete();

        // 이 역시 Dirty Checking에 의해 트랜잭션 종료 시 UPDATE 쿼리가 날아감 (deleted = true)
        log.info("담당자 정보가 안전하게 삭제(Soft Delete) 처리되었습니다. ManagerID: {}", managerId);
    }

    /**
     * 담당자 단건 상세 조회 (Read)
     */
    // 클래스 상단에 @Transactional(readOnly = true)가 있으므로 여기서는 생략 가능
    public CompanyManagerResponse getManager(Long managerId) {
        CompanyManager manager = getCompanyManager(managerId);

        // Entity -> DTO 변환 팩토리 메서드 활용
        return CompanyManagerResponse.from(manager);
    }

    /**
     * 특정 회사의 담당자 목록 페이징 조회 (Read)
     */
    public Page<CompanyManagerResponse> getManagersByCompany(Long companyId, Pageable pageable) {
        // 1. 회사가 실제로 존재하는지 먼저 검증 (Fail-Fast)
        if (!companyRepository.existsById(companyId)) {
            throw new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND);
        }

        // 2. Repository에서 Page<Entity> 형태로 조회 (1단계에서 만든 @EntityGraph 적용된 메서드)
        Page<CompanyManager> managerPage = companyManagerRepository.findAllByCompanyId(companyId, pageable);

        // 3. Page<Entity>를 Page<DTO>로 매핑 (map 연산자 활용)
        // JPA의 Page 객체는 내부 데이터를 변환할 수 있는 map() 메서드를 제공합니다.
        return managerPage.map(CompanyManagerResponse::from);
    }

    private CompanyManager getCompanyManager(Long managerId) {
        return companyManagerRepository.findById(managerId)
                .orElseThrow(() -> new ApiException(CompanyManagerErrorCode.COMPANY_MANAGER_NOT_FOUND));
    }
}