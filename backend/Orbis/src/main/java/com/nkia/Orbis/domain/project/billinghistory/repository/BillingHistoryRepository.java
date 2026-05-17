package com.nkia.Orbis.domain.project.billinghistory.repository;

import com.nkia.Orbis.domain.project.billinghistory.entity.BillingHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingHistoryRepository extends JpaRepository<BillingHistory, Long> {
    List<BillingHistory> findByOriginalBillingIdOrderByCreatedAtDesc(Long originalBillingId);
}
