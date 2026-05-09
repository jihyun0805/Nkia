package com.nkia.Orbis.domain.project.project.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.Maintenance;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import com.nkia.Orbis.domain.admin.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class Project extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // PJT 번호
    @Column(unique = true, nullable = false)
    private String pjtNumber;

    // 사업명
    @Column(nullable = false)
    private String pjtName;

    // 사업 금액
    private Long totalAmount;

    // 프로젝트 타입 (솔루션, 유지보수 등)
    @Enumerated(EnumType.STRING)
    private ProjectType type;

    // 사업 코드
    @Enumerated(EnumType.STRING)
    private ProjectCode code;

    // 사업 수행 기간
    private LocalDate startDate;
    private LocalDate endDate;

    // 수주보고서
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_id", unique = true)
    private OrderReport orderReport;

    // 담당 PM
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    // 사업 결과 보고서
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectResultReport> resultReports = new ArrayList<>();

    // 유지보수
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Maintenance> maintenances = new ArrayList<>();

    // 유지보수 견적서
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaintenanceQuotation> maintenanceQuotations = new ArrayList<>();

    @Builder
    public Project(ProjectCode code, ProjectType type, OrderReport orderReport, String pjtName, Long totalAmount,
                   User salesRepresentative) {
        this.code = code;
        this.type = type;
        this.orderReport = orderReport;
        this.pjtName = pjtName;
        this.totalAmount = totalAmount;
        this.manager = manager;
        this.salesRepresentative = salesRepresentative;
    }

    public void assignProjectNumber(String pjtNumber) {
        if (this.pjtNumber != null) {
            throw new IllegalStateException("이미 PJT 번호가 부여된 사업입니다.");
        }
        this.pjtNumber = pjtNumber;
    }

    public void updateProjectInfo(LocalDate startDate, LocalDate endDate, User manager, User salesRepresentative) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.manager = manager;
        this.salesRepresentative = salesRepresentative;
    }
}