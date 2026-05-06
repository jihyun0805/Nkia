package com.nkia.Orbis.domain.maintenance.customersupport.activity.repository;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerSupportRepository extends JpaRepository<CustomerSupport, Long> {
}
