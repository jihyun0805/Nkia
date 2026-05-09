package com.nkia.Orbis.domain.project.billing.dto.response;

import com.nkia.Orbis.domain.project.billing.entity.Billing;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BillingDetailResponse {

    @Schema(description = "청구 ID")
    private Long id;

    @Schema(description = "수주보고서 ID")
    private Long orderReportId;

    @Schema(description = "고객사명")
    private String customerName;

    @Schema(description = "사업명")
    private String projectName;

    @Schema(description = "청구 금액")
    private Long billingAmount;

    @Schema(description = "발행 희망일")
    private LocalDate requestedIssueDate;

    @Schema(description = "세금계산서 발행일")
    private LocalDate issuedAt;

    @Schema(description = "수금일")
    private LocalDate collectedAt;

    @Schema(description = "특기사항")
    private String remarks;

    @Schema(description = "세금계산서 이미지 파일 ID")
    private Long invoiceImageId;

    @Schema(description = "현재 상태")
    private String status;

    @Schema(description = "요청자")
    private String createdBy;

    @Schema(description = "요청일")
    private LocalDateTime createdAt;

    public static BillingDetailResponse from(Billing billing) {
        return BillingDetailResponse.builder()
                .id(billing.getId())
                .orderReportId(billing.getOrderReport().getId())
                .customerName(billing.getOrderReport().getFinalCustomerCompany().getName())
                .projectName(billing.getOrderReport().getProjectOpportunity().getOpportunityName())
                .billingAmount(billing.getBillingAmount())
                .requestedIssueDate(billing.getRequestedIssueDate())
                .issuedAt(billing.getIssuedAt())
                .collectedAt(billing.getCollectedAt())
                .remarks(billing.getRemarks())
                .invoiceImageId(billing.getInvoiceImageId())
                .status(billing.getStatus().name())
                .createdBy(billing.getCreatedBy())
                .createdAt(billing.getCreatedAt())
                .build();
    }
}