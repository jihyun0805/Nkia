package com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository;

import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectOpportunityRepository extends JpaRepository<ProjectOpportunity, Long> {

    /**
     * [1] 목록 조회 (페이징 + 정렬 지원) - @EntityGraph를 사용하여 N+1 문제를 방지합니다. - 목록 응답 DTO에서 고객사 이름이 필요하므로, DB에서 조회할 때 Left
     * OuterJoin으로 한 번에 가져옵니다.
     */
    @EntityGraph(attributePaths = {"customerCompany", "salesRepresentative", "rfpAnalyzeResult", "prb", "bidResult",
            "orderReports"})
    Page<ProjectOpportunity> findAll(Pageable pageable);

    /**
     * [2] 단건 상세 조회 - 상세 조회 시에도 고객사 정보가 바로 필요하므로 Fetch Join(EntityGraph)을 적용합니다. - 기본 findById를 오버라이딩하여 최적화합니다.
     */
    @Override
    @EntityGraph(attributePaths = {"customerCompany", "salesRepresentative", "rfpAnalyzeResult", "prb", "bidResult",
            "orderReports"})
    Optional<ProjectOpportunity> findById(Long id);

    /**
     * [3] 중복 검사 로직 - 사업 기회 신규 등록 시, 동일한 opportunityCode가 있는지 검증하기 위해 사용합니다.
     */
    boolean existsByOpportunityCode(String opportunityCode);

    /**
     * [4] 검색 기능 예시 (사업기회명 검색) - 나중에 조건 검색(조회 기능 R10.1)이 필요할 때 이렇게 확장할 수 있습니다.
     */
    @EntityGraph(attributePaths = {"customerCompany"})
    Page<ProjectOpportunity> findByOpportunityNameContainingIgnoreCase(String keyword, Pageable pageable);

    @EntityGraph(attributePaths = {"customerCompany", "salesRepresentative", "rfpAnalyzeResult", "prb", "bidResult",
            "orderReports"})
    Page<ProjectOpportunity> findAllByCustomerCompanyId(Long customerCompanyId, Pageable pageable);
}
