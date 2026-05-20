package com.nkia.Orbis.domain.bid.bidresult.repository;

import com.nkia.Orbis.domain.bid.bidresult.entity.BidResultHistory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BidResultHistoryRepository extends JpaRepository<BidResultHistory, Long> {

    // 다음 버전 채번을 위한 원본 ID 기준 이력 개수 조회
    long countByBidResultId(Long bidResultId);

    // 최신 버전 순으로 이력 조회
    List<BidResultHistory> findByBidResultIdOrderByVersionDesc(Long bidResultId);

    @EntityGraph(attributePaths = {
            "projectOpportunity",
            "projectOpportunity.customerCompany",
            "projectOpportunity.prb",
            "projectOpportunity.rfpAnalyzeResult",
            "proposal"
    })
    Optional<BidResultHistory> findWithDetailsById(Long id);
}