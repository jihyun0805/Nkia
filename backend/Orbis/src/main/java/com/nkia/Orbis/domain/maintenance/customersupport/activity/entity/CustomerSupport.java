package com.nkia.Orbis.domain.maintenance.customersupport.activity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.admin.user.entity.User;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomerSupport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_id", unique = true)
    private Maintenance maintenance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_company_id", nullable = false)
    private Company customerCompany; // 고객사

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private CustomerSupportRequest request;

    @Column(name = "activity_type", nullable = false)
    private ActivityType activityType; // 활동 구분 (정기점검 / 요청)

    @Column(name = "activity_start_time")
    private LocalDateTime activityStartTime;

    @Column(name = "activity_end_time")
    private LocalDateTime activityEndTime;

    @Column(name = "activity_content", columnDefinition = "TEXT")
    private String activityContent; // 고객 지원 내용

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrant_id")
    private User registrant; // 등록자

    @Column(name = "remarks", length = 1000)
    private String remarks; // 특기사항

    @OneToMany(mappedBy = "customerSupport", cascade = CascadeType.ALL, orphanRemoval = true)
    private final List<CustomerSupportOtherDepartmentUser> otherDepartmentUsers = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinTable(name = "customer_support_activity_file", joinColumns = @JoinColumn(name = "request_id"), inverseJoinColumns = @JoinColumn(name = "upload_file_id"))
    private final List<UploadFile> attachedFiles = new ArrayList<>();

    public void addAttachedFile(UploadFile file) {
        this.attachedFiles.add(file);
    }

    public void addOtherDepartmentUser(CustomerSupportOtherDepartmentUser user) {
        this.otherDepartmentUsers.add(user);
        user.assignCustomerSupport(this);
    }

    @Builder
    public CustomerSupport(CustomerSupportRequest request, Maintenance maintenance, Company customerCompany,
                           ActivityType activityType, LocalDateTime activityStartTime, LocalDateTime activityEndTime,
                           String activityContent, User registrant, String remarks) {
        this.request = request;
        this.maintenance = maintenance;
        this.customerCompany = customerCompany;
        this.activityType = activityType;
        this.activityStartTime = activityStartTime;
        this.activityEndTime = activityEndTime;
        this.activityContent = activityContent;
        this.registrant = registrant;
        this.remarks = remarks;
    }

    public void update(Company customerCompany, ActivityType type, LocalDateTime start, LocalDateTime end, String content, User registrant, String remarks) {
        this.customerCompany = customerCompany;
        this.activityType = type;
        this.activityStartTime = start;
        this.activityEndTime = end;
        this.activityContent = content;
        this.registrant = registrant;
        this.remarks = remarks;
    }

    public void clearCollections() {
        this.otherDepartmentUsers.clear();
        this.attachedFiles.clear();
    }
}