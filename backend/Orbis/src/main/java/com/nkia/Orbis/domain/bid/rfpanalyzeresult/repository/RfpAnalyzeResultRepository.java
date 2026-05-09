package com.nkia.Orbis.domain.bid.rfpanalyzeresult.repository;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RfpAnalyzeResultRepository extends JpaRepository<RfpAnalyzeResult, Long> {

  // 1. 목록 조회 (페이징)
  // 목록에서는 담당자 이름, 사업기회 등만 필요하다면 가벼운 EntityGraph를 적용합니다.
  @EntityGraph(attributePaths = {"assignee", "projectOpportunity"})
  Page<RfpAnalyzeResult> findAll(Pageable pageable);

  // 2. 상세 조회 (N+1 문제 방지)
  // DTO에서 접근하는 깊은 연관관계들을 한 번의 쿼리로 가져오도록 명시합니다.
  // (참고: 컬렉션인 requirements나 productModules는 Fetch Join 개수 제한이나 페이징 제약이 있을 수 있어
  // 실무에서는 default_batch_fetch_size 설정과 병행하여 사용합니다.)
  @EntityGraph(attributePaths = {
      "requirements",
      "assignee",
      "projectOpportunity",
      "projectOpportunity.customerCompany",
      "projectOpportunity.salesRepresentative"
  })
  Optional<RfpAnalyzeResult> findById(Long id);
}
