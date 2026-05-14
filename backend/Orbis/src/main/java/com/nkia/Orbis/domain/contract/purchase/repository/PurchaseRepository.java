package com.nkia.Orbis.domain.contract.purchase.repository;

import com.nkia.Orbis.domain.contract.purchase.entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
}
