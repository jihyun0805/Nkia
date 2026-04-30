package com.nkia.Orbis.domain.activity.quotation.repository;

import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    @Query("""
                select count(distinct q.quotationCode)
                from Quotation q
                where q.quotationDate = :quotationDate
            """)
    long countDistinctQuotationCodeByQuotationDate(LocalDate quotationDate);
}
