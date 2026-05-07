package com.nkia.Orbis.domain.company.repository;

import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    // 회사 코드로 중복 가입 검증 (Fail-Fast)
    boolean existsByCode(String code);

    // 사업자등록번호로 중복 가입 검증
    boolean existsByBusinessRegistrationNumber(String businessRegistrationNumber);

    // 전체 회사 목록 페이징 (선택적: 타입별 필터링)
    Page<Company> findAllByCompanyType(CompanyType companyType, Pageable pageable);
}
