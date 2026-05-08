package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuotationListResponse {
    private Long id;

    private String quotationCode;

    private Long projectOpportunityId;

    private LocalDate quotationDate;

    private Long consumerTotalPrice;

    private Long supplyTotalPrice;

    private Long laborTotalPrice;

    private Long totalPrice;

    public static QuotationListResponse from(Quotation quotation) {
        return QuotationListResponse.builder()
                .id(quotation.getId())
                .quotationCode(quotation.getQuotationCode())
                .projectOpportunityId(
                        quotation.getProjectOpportunity() == null
                                ? null
                                : quotation.getProjectOpportunity().getId()
                )
                .quotationDate(quotation.getQuotationDate())
                .consumerTotalPrice(quotation.getConsumerTotalPrice())
                .supplyTotalPrice(quotation.getSupplyTotalPrice())
                .laborTotalPrice(quotation.getLaborTotalPrice())
                .totalPrice(quotation.getTotalPrice())
                .build();
    }
}
