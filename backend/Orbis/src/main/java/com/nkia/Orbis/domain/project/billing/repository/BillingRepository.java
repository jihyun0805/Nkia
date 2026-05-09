package com.nkia.Orbis.domain.project.billing.repository;

import com.nkia.Orbis.domain.project.billing.entity.Billing;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingRepository extends JpaRepository<Billing, Long> {
    List<Billing> findAllByOrderByIdDesc();
}
