package com.nkia.Orbis.domain.salesactivity.salesactivityrequest.repository;

import com.nkia.Orbis.domain.salesactivity.salesactivityrequest.entity.SalesActivityRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesActivityRequestRepository extends JpaRepository<SalesActivityRequest, Long> {

    boolean existsBySalesActivityId(Long salesActivityId);
}
