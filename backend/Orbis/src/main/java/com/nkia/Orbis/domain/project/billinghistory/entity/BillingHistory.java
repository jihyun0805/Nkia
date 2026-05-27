package com.nkia.Orbis.domain.project.billinghistory.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.billing.entity.BillingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class BillingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long originalBillingId;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus approvalStatus;

    private String customerName;
    private String projectName;
    private Long billingAmount;
    private LocalDate requestedIssueDate;
    private LocalDate issuedAt;
    private LocalDate collectedAt;
    private String salesRepName;
    private String requesterName;
    private String remarks;
    private Long invoiceImageId;

    @Enumerated(EnumType.STRING)
    private BillingStatus status;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public BillingHistory(Long originalBillingId, ApprovalStatus approvalStatus, String customerName,
                          String projectName, Long billingAmount, LocalDate requestedIssueDate,
                          LocalDate issuedAt, LocalDate collectedAt, String salesRepName,
                          String requesterName, String remarks, Long invoiceImageId, BillingStatus status) {
        this.originalBillingId = originalBillingId;
        this.approvalStatus = approvalStatus;
        this.customerName = customerName;
        this.projectName = projectName;
        this.billingAmount = billingAmount;
        this.requestedIssueDate = requestedIssueDate;
        this.issuedAt = issuedAt;
        this.collectedAt = collectedAt;
        this.salesRepName = salesRepName;
        this.requesterName = requesterName;
        this.remarks = remarks;
        this.invoiceImageId = invoiceImageId;
        this.status = status;
    }

    public static BillingHistory createSnapshot(Billing billing, String requesterName) {
        String customer = (billing.getOrderReport() != null && billing.getOrderReport().getFinalCustomerCompany() != null)
                ? billing.getOrderReport().getFinalCustomerCompany().getName() : null;

        String project = (billing.getOrderReport() != null && billing.getOrderReport().getProjectOpportunity() != null)
                ? billing.getOrderReport().getProjectOpportunity().getOpportunityName() : null;

        String salesRep = (billing.getOrderReport() != null && billing.getOrderReport().getPm() != null)
                ? billing.getOrderReport().getPm().getName() : null;

        return BillingHistory.builder()
                .originalBillingId(billing.getId())
                .approvalStatus(billing.getApprovalStatus())
                .customerName(customer)
                .projectName(project)
                .billingAmount(billing.getBillingAmount())
                .requestedIssueDate(billing.getRequestedIssueDate())
                .issuedAt(billing.getIssuedAt())
                .collectedAt(billing.getCollectedAt())
                .salesRepName(salesRep)
                .requesterName(requesterName)
                .remarks(billing.getRemarks())
                .invoiceImageId(billing.getInvoiceImageId())
                .status(billing.getStatus())
                .build();
    }
}
