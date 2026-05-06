package com.nkia.Orbis.domain.maintenance.customersupport.request.repository;

import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerSupportRequestRepository extends JpaRepository<CustomerSupportRequest, Long> {
}
