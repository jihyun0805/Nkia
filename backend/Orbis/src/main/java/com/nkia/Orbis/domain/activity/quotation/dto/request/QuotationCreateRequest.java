package com.nkia.Orbis.domain.activity.quotation.dto.request;

import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItem;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;

public class QuotationCreateRequest {

    private Long projectOpportunityId;

    private LocalDate quotationDate;

    private String paymentCondition;

    private String note;

    @Valid
    private List<QuotationSolutionItem> quotationSolutionItems;

    @Valid
    private List<QuotationLaborItem> quotationLaborItems;

}
