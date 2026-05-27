package com.nkia.Orbis.domain.company.repository;

import com.nkia.Orbis.domain.company.entity.CompanyManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyManagerRepository extends JpaRepository<CompanyManager, Long> {

    // 특정 회사의 담당자 목록 페이징 조회
    // @EntityGraph를 사용하여 N+1 문제를 방지하고 Company 정보를 함께(Fetch Join) 가져옵니다.
    @EntityGraph(attributePaths = {"company"})
    Page<CompanyManager> findAllByCompanyId(Long companyId, Pageable pageable);

    // 이메일 중복 검사용 (신규 등록 시 Validation)
    boolean existsByEmail(String email);
}
