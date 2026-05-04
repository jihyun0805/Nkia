package com.nkia.Orbis.domain.activity.quotation.repository;

import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    @Query(
            value = """
                    SELECT quotation_code
                    FROM quotation
                    WHERE quotation_code LIKE CONCAT(:prefix, '%')
                    ORDER BY quotation_code DESC
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<String> findLastQuotationCodeIncludingDeleted(@Param("prefix") String prefix);
}
