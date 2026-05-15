package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuotationListResponse {
    private Long id;

    private String status;

    private String quotationCode;

    private Long projectOpportunityId;

    private String companyName;

    private String projectOpportunityName;

    private LocalDate quotationDate;

    private Long consumerTotalPrice;

    private Long supplyTotalPrice;

    private Long laborTotalPrice;

    private Long totalPrice;

    public static QuotationListResponse from(Quotation quotation) {
        return QuotationListResponse.builder()
                .id(quotation.getId())
                .status(quotation.getStatus().getDescription())
                .quotationCode(quotation.getQuotationCode())
                .projectOpportunityId(quotation.getProjectOpportunity().getId())
                .companyName(quotation.getProjectOpportunity().getCustomerCompany().getName())
                .projectOpportunityName(quotation.getProjectOpportunity().getOpportunityName())
                .quotationDate(quotation.getQuotationDate())
                .consumerTotalPrice(quotation.getConsumerTotalPrice())
                .supplyTotalPrice(quotation.getSupplyTotalPrice())
                .laborTotalPrice(quotation.getLaborTotalPrice())
                .totalPrice(quotation.getTotalPrice())
                .build();
    }
}
