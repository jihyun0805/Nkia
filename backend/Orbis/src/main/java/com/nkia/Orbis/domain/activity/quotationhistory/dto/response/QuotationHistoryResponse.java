package com.nkia.Orbis.domain.activity.quotationhistory.dto.response;

import com.nkia.Orbis.domain.activity.quotationhistory.entity.QuotationHistory;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuotationHistoryResponse {

    private Long id;

    private Integer version;

    private String quotationCode;

    private String refNo;

    private Long projectOpportunityId;

    private String companyName;

    private String projectOpportunityName;

    private LocalDate quotationDate;

    private String paymentCondition;

    private Long consumerTotalPrice;

    private Long supplyTotalPrice;

    private Long laborTotalPrice;

    private Long totalPrice;

    private String note;

    private List<SolutionItemHistoryResponse> quotationSolutionItems;

    private List<LaborItemHistoryResponse> quotationLaborItems;

    public static QuotationHistoryResponse from(QuotationHistory quotation) {
        return QuotationHistoryResponse.builder()
                .id(quotation.getId())
                .version(quotation.getVersion())
                .quotationCode(quotation.getQuotationCode())
                .refNo(quotation.getRefNo())
                .projectOpportunityId(quotation.getProjectOpportunity().getId())
                .companyName(quotation.getProjectOpportunity().getCustomerCompany().getName())
                .projectOpportunityName(quotation.getProjectOpportunity().getOpportunityName())
                .quotationDate(quotation.getQuotationDate())
                .paymentCondition(quotation.getPaymentCondition())
                .consumerTotalPrice(quotation.getConsumerTotalPrice())
                .supplyTotalPrice(quotation.getSupplyTotalPrice())
                .laborTotalPrice(quotation.getLaborTotalPrice())
                .totalPrice(quotation.getTotalPrice())
                .note(quotation.getNote())
                .quotationSolutionItems(
                        quotation.getQuotationSolutionItems().stream()
                                .map(SolutionItemHistoryResponse::from)
                                .toList()
                )
                .quotationLaborItems(
                        quotation.getQuotationLaborItems().stream()
                                .map(LaborItemHistoryResponse::from)
                                .toList()
                )
                .build();
    }
}
