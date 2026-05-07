package com.nkia.Orbis.domain.company.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.domain.company.dto.request.CompanyCreateRequest;
import com.nkia.Orbis.domain.company.dto.request.CompanyUpdateRequest;
import com.nkia.Orbis.domain.company.dto.response.CompanyResponse;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyType;
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
@Transactional(readOnly = true) // 기본 읽기 전용 트랜잭션 (성능 최적화)
public class CompanyService {

    private final CompanyRepository companyRepository;

    /**
     * 신규 고객사/협력사 등록 (Create)
     */
    @Transactional // 쓰기 작업이므로 트랜잭션 활성화
    public Long createCompany(CompanyCreateRequest request) {
        // 1. Fail-Fast: 회사코드 중복 검증
        if (companyRepository.existsByCode(request.code())) {
            throw new ApiException(CompanyErrorCode.DUPLICATE_COMPANY_CODE);
        }

        // 2. Fail-Fast: 사업자등록번호 중복 검증
        if (companyRepository.existsByBusinessRegistrationNumber(request.businessRegistrationNumber())) {
            throw new ApiException(CompanyErrorCode.DUPLICATE_BUSINESS_NUMBER);
        }

        // 3. Entity 변환 및 영속화
        return saveCompany(request);
    }

    private Long saveCompany(CompanyCreateRequest request) {
        Company company = request.toEntity();
        Company savedCompany = companyRepository.save(company);

        log.info("새로운 회사가 등록되었습니다. Type: {}, Code: {}, Name: {}",
                savedCompany.getCompanyType(), savedCompany.getCode(), savedCompany.getName());
        return savedCompany.getId();
    }

    /**
     * 회사 정보 수정 (Update)
     */
    @Transactional
    public void updateCompany(Long companyId, CompanyUpdateRequest request) {
        Company company = getCompanyEntity(companyId);

        // 엔티티 내부 비즈니스 메서드 호출 (객체 지향적 설계)
        company.updateInfo(
                request.name(),
                request.sector(),
                request.category(),
                request.address()
        );

        // 더티 체킹(Dirty Checking)으로 인해 save() 불필요
        log.info("회사 정보가 수정되었습니다. CompanyID: {}", companyId);
    }

    /**
     * 회사 논리적 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteCompany(Long companyId) {
        Company company = getCompanyEntity(companyId);

        // BaseEntity에서 상속받은 delete 메서드 호출
        company.delete();

        // 트랜잭션 커밋 시점에 자동으로 UPDATE 쿼리(deleted = true) 발생
        log.info("회사 정보가 삭제(Soft Delete) 처리되었습니다. CompanyID: {}", companyId);
    }

    /**
     * 회사 단건 상세 조회 (Read)
     */
    public CompanyResponse getCompany(Long companyId) {
        Company company = getCompanyEntity(companyId);
        return CompanyResponse.from(company);
    }

    /**
     * 회사 목록 페이징 조회 (Read) - type 파라미터가 null이면 전체 조회, 있으면 해당 타입(CUSTOMER/PARTNER)만 조회
     */
    public Page<CompanyResponse> getCompanies(CompanyType type, Pageable pageable) {
        Page<Company> companyPage;

        if (type == null) {
            companyPage = companyRepository.findAll(pageable);
        } else {
            companyPage = companyRepository.findAllByCompanyType(type, pageable);
        }

        // Page<Entity>를 Page<DTO>로 매핑하여 반환 (메모리 낭비 없는 최적의 변환)
        return companyPage.map(CompanyResponse::from);
    }

    /**
     * 중복 코드를 제거하기 위한 엔티티 조회 전용 private 메서드
     */
    private Company getCompanyEntity(Long companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));
    }
}