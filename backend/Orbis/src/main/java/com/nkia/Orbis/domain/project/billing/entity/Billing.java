package com.nkia.Orbis.domain.project.billing.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.project.billing.dto.request.BillingUpdateRequest;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class Billing extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private ApprovalStatus approvalStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_id")
    private OrderReport orderReport;

    private Long billingAmount;     // 청구 금액

    private LocalDate requestedIssueDate; // 발행 희망일

    private LocalDate issuedAt;     // 세금계산서 발행일

    private LocalDate collectedAt;  // 수금일

    private String remarks;         // 특기사항

    private Long invoiceImageId;    // 세금계산서 이미지 첨부파일

    @Enumerated(EnumType.STRING)
    private BillingStatus status;

    @Builder
    public Billing(OrderReport orderReport, Long billingAmount, LocalDate requestedIssueDate, String remarks,
                   BillingStatus status) {
        this.orderReport = orderReport;
        this.billingAmount = billingAmount;
        this.requestedIssueDate = requestedIssueDate;
        this.remarks = remarks;
        this.status = status;
        this.approvalStatus = ApprovalStatus.DRAFT;
    }

    /**
     * 세금계산서 발행 처리
     */
    public void issue(LocalDate issuedAt, Long invoiceImageId) {
        this.issuedAt = issuedAt;
        this.invoiceImageId = invoiceImageId;
        this.status = BillingStatus.ISSUED;
    }

    /**
     * 수금 완료 처리
     */
    public void collect(LocalDate collectedAt) {
        this.collectedAt = collectedAt;
        this.status = BillingStatus.COLLECTED;
    }

    public void updateByStatus(BillingUpdateRequest dto) {
        this.remarks = dto.getRemarks();

        if (this.status == BillingStatus.REQUESTED) {
            this.billingAmount = dto.getBillingAmount();
            this.requestedIssueDate = dto.getRequestedIssueDate();
        }

        if (this.status == BillingStatus.ISSUED) {
            this.issuedAt = dto.getIssuedAt();
            this.invoiceImageId = dto.getInvoiceImageId();
        }

        if (this.status == BillingStatus.COLLECTED) {
            this.collectedAt = dto.getCollectedAt();
        }
    }

    public void delete() {
        super.delete();
    }

    public void approveBilling() {
        this.status = BillingStatus.APPROVED;
    }

    public void submit() {
        this.approvalStatus = ApprovalStatus.PENDING;
    }

    public void approve() {
        this.approvalStatus = ApprovalStatus.APPROVED;
    }

    public void reject() {
        this.approvalStatus = ApprovalStatus.REJECTED;
    }

    public void cancel() {
        this.approvalStatus = ApprovalStatus.CANCELED;
    }

    public boolean isDraft() {
        return this.approvalStatus == ApprovalStatus.DRAFT;
    }
}