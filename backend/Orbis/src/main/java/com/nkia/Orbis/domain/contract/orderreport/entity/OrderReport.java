package com.nkia.Orbis.domain.contract.orderreport.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyManager;
import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.user.entity.User;
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
import lombok.Getter;
import lombok.NoArgsConstructor;


@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String OrderReportCode;

    @Enumerated(EnumType.STRING)
    private OrderReportType type;

    private boolean channel;

    @Enumerated(EnumType.STRING)
    private CodeType codeType;

    private LocalDate contractDate;

    private Integer freeMaintenacePeriodMonths;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    private Integer contractPeriodMonths;

    private String scopeOfWork;

    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pm_user_id")
    private User pm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_counterpart_manager_id")
    private CompanyManager contractCounterpartManager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "final_customer_company_id")
    private Company finalCustomerCompany;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "final_customer_manager_id")
    private CompanyManager finalCustomerManager;

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportMaintenance> maintenances = new ArrayList<>();

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportLicense> licenses = new ArrayList<>();

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportService> services = new ArrayList<>();

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportMaintenanceAmount> maintenanceAmounts = new ArrayList<>();

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportOther> others = new ArrayList<>();

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportPurchase> purchases = new ArrayList<>();

    @OneToOne(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private Contract contract;

    @OneToOne(mappedBy = "orderReport")
    private Project project;

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Billing> billings = new ArrayList<>();
}