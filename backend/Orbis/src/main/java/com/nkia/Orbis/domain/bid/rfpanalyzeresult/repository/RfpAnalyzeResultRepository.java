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

  // 1. 목록 조회 (페이징 + 정렬)
  Page<RfpAnalyzeResult> findAll(Pageable pageable);

  // 2. 상세 조회 (N+1 문제 방지)
  // RfpAnalyzeResult를 조회할 때 requirements(요구사항 목록)를 한 번의 JOIN 쿼리로 가져옵니다.
  @EntityGraph(attributePaths = {"requirements"})
  Optional<RfpAnalyzeResult> findById(Long id);
}
