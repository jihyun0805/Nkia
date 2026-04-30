package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItem;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import java.time.LocalDate;
import java.util.List;

public class QuotationResponse {
    private Long id;

    private String quotationCode;

    private ProjectOpportunity projectOpportunity;

    private LocalDate quotationDate;

    private String paymentCondition;

    private Long consumerTotalPrice;

    private Long supplyTotalPrice;

    private Long laborTotalPrice;

    private Long totalPrice;

    private String note;

    private List<QuotationSolutionItem> quotationSolutionItems;

    private List<QuotationLaborItem> quotationLaborItems;

}
