package com.nkia.Orbis.domain.activity.quotation.dto.request;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;

@Getter
public class QuotationCreateRequest {

    private Long projectOpportunityId;

    private String refNo;

    private LocalDate quotationDate;

    private String paymentCondition;

    private String note;

    @Valid
    private List<SolutionItemCreateRequest> quotationSolutionItems;

    @Valid
    private List<LaborItemCreateRequest> quotationLaborItems;

}
