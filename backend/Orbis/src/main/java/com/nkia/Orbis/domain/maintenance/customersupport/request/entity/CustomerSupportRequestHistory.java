package com.nkia.Orbis.domain.maintenance.customersupport.request.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class CustomerSupportRequestHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long id;

    // 원본 고객지원요청 ID
    @Column(nullable = false)
    private Long originalRequestId;

    // 결재 상태 (해당 시점)
    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status")
    private ApprovalStatus status;

    // 화면 표출 데이터 (문자열 등 원시타입으로 보관)
    private String customerName;
    private LocalDate requestStartDate;
    private LocalDate requestEndDate;

    @Column(columnDefinition = "TEXT")
    private String requestContent;

    private String requesterName;
    private String registrantName;
    private String salesRepName;
    private String supportManagerName;

    @Column(length = 1000)
    private String remarks;

    @Builder
    public CustomerSupportRequestHistory(Long originalRequestId, ApprovalStatus status, String customerName,
                                         LocalDate requestStartDate, LocalDate requestEndDate, String requestContent,
                                         String requesterName, String registrantName, String salesRepName,
                                         String supportManagerName, String remarks) {
        this.originalRequestId = originalRequestId;
        this.status = status;
        this.customerName = customerName;
        this.requestStartDate = requestStartDate;
        this.requestEndDate = requestEndDate;
        this.requestContent = requestContent;
        this.requesterName = requesterName;
        this.registrantName = registrantName;
        this.salesRepName = salesRepName;
        this.supportManagerName = supportManagerName;
        this.remarks = remarks;
    }

    public static CustomerSupportRequestHistory createSnapshot(CustomerSupportRequest request) {
        return CustomerSupportRequestHistory.builder()
                .originalRequestId(request.getId())
                .status(request.getStatus())
                .customerName(request.getCustomerCompany() != null ? request.getCustomerCompany().getName() : null)
                .requestStartDate(request.getRequestStartDate())
                .requestEndDate(request.getRequestEndDate())
                .requestContent(request.getRequestContent())
                .requesterName(request.getRequester() != null ? request.getRequester().getName() : null)
                .registrantName(request.getRegistrant() != null ? request.getRegistrant().getName() : null)
                .salesRepName(request.getSalesRep() != null ? request.getSalesRep().getName() : null)
                .supportManagerName(request.getSupportManager() != null ? request.getSupportManager().getName() : null)
                .remarks(request.getRemarks())
                .build();
    }
}
