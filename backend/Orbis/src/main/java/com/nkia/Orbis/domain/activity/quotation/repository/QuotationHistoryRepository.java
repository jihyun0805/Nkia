package com.nkia.Orbis.domain.activity.quotation.repository;

import com.nkia.Orbis.domain.activity.quotation.entity.QuotationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuotationHistoryRepository extends JpaRepository<QuotationHistory, Long> {
}
