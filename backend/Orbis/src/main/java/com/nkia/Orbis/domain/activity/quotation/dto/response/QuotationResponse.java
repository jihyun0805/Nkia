package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuotationResponse {
    private Long id;

    private Long workflowId;

    private ApprovalStatus status;

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

    private List<SolutionItemResponse> quotationSolutionItems;

    private List<LaborItemResponse> quotationLaborItems;

    public static QuotationResponse from(Quotation quotation, Long workflowId) {
        return QuotationResponse.builder()
                .id(quotation.getId())
                .workflowId(workflowId)
                .status(quotation.getStatus())
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
                                .map(SolutionItemResponse::from)
                                .toList()
                )
                .quotationLaborItems(
                        quotation.getQuotationLaborItems().stream()
                                .map(LaborItemResponse::from)
                                .toList()
                )
                .build();
    }
}
