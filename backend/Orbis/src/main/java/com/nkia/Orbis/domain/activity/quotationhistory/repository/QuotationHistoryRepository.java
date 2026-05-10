package com.nkia.Orbis.domain.activity.quotationhistory.repository;

import com.nkia.Orbis.domain.activity.quotationhistory.entity.QuotationHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuotationHistoryRepository extends JpaRepository<QuotationHistory, Long> {

    long countByQuotationCode(String quotationCode);

    List<QuotationHistory> findByQuotationCodeOrderByVersionDesc(
            String quotationCode
    );
}
