package com.nkia.Orbis.domain.maintenance.customersupport.request.entity;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomerSupportRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long id;

    @Column(name = "customer_company_code", nullable = false)
    private Long customerCompanyCode;

    @Column(name = "request_start_date")
    private LocalDate requestStartDate;

    @Column(name = "request_end_date")
    private LocalDate requestEndDate;

    @Column(name = "request_content", columnDefinition = "TEXT")
    private String requestContent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id")
    private User requester; // 요청인

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrant_id")
    private User registrant; // 등록자

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_rep_id")
    private User salesRep; // 영업대표

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_manager_id")
    private User supportManager; // 고객지원 담당자

    @Column(name = "remarks", length = 1000)
    private String remarks; // 특기사항

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinTable(name = "customer_support_request_file", joinColumns = @JoinColumn(name = "request_id"), inverseJoinColumns = @JoinColumn(name = "upload_file_id"))
    private final List<UploadFile> attachedFiles = new ArrayList<>();

    public void addAttachedFile(UploadFile file) {
        this.attachedFiles.add(file);
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    @Builder
    public CustomerSupportRequest(Long customerCompanyCode, LocalDate requestStartDate, LocalDate requestEndDate,
                                  String requestContent, User requester, User registrant,
                                  User salesRep, User supportManager, String remarks) {
        this.customerCompanyCode = customerCompanyCode;
        this.requestStartDate = requestStartDate;
        this.requestEndDate = requestEndDate;
        this.requestContent = requestContent;
        this.requester = requester;
        this.registrant = registrant;
        this.salesRep = salesRep;
        this.supportManager = supportManager;
        this.remarks = remarks;
    }
}
