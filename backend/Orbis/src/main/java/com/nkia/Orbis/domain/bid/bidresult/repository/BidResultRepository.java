package com.nkia.Orbis.domain.bid.bidresult.repository;

import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BidResultRepository extends JpaRepository<BidResult, Long> {

    /**
     * [상세 조회] 연관된 모든 엔티티를 한 번에 가져와 N+1 방지
     */
    @EntityGraph(attributePaths = {
            "salesRepresentative",
            "projectManager",
            "projectOpportunity",
            "projectOpportunity.customerCompany",
            "projectOpportunity.rfpAnalyzeResult",
            "proposal"
    })
    Optional<BidResult> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {
            "salesRepresentative",
            "projectOpportunity",
            "projectOpportunity.customerCompany",
            "projectOpportunity.rfpAnalyzeResult"
    })
    Page<BidResult> findAll(Pageable pageable);
}
