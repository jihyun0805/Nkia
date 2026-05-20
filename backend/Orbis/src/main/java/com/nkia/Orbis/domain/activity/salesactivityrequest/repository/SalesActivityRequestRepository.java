package com.nkia.Orbis.domain.activity.salesactivityrequest.repository;

import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesActivityRequestRepository extends JpaRepository<SalesActivityRequest, Long> {

    boolean existsBySalesActivityId(Long salesActivityId);

    List<SalesActivityRequest> findByTargetUserId(UUID targetUserId);

    @EntityGraph(attributePaths = {
            "company",
            "salesActivity",
            "salesActivity.projectOpportunity",
            "salesActivity.projectOpportunity.rfpAnalyzeResult",
            "requestUser"
    })
    Optional<SalesActivityRequest> findProposalInfoById(Long id);
}
