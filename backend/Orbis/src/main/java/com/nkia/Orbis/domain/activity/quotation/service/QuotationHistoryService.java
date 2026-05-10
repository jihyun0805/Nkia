package com.nkia.Orbis.domain.activity.quotation.service;

import com.nkia.Orbis.domain.activity.quotation.repository.QuotationHistoryRepository;
import com.nkia.Orbis.domain.activity.quotation.repository.QuotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QuotationHistoryService {

    QuotationHistoryRepository quotationHistoryRepository;
    QuotationRepository quotationRepository;

}
