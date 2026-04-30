package com.nkia.Orbis.domain.activity.quotation.repository;

import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
}
