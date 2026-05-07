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
    private String orderReportCode;

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
    private List<OrderReportMaintenanceOnlyItem> maintenanceOnlyItems = new ArrayList<>();

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

    // OrderReportLicense totalPrice들의 총합
    private Long licenseTotal;

    // OrderReportService totalPrice들의 총합
    private Long serviceTotal;

    // OrderReportMaintenance totalPrice들의 총합
    private Long maintenanceTotal;

    // OrderReportOther totalPrice들의 총합
    private Long otherTotal;

    // OrderReportPurchase totalPrice들의 총합
    private Long purchaseTotal;

    // OrderReportLicense 중 ProductClass가 EMS인 것들의 totalPrice들의 총합
    private Long emsSummary;

    // OrderReportLicense 중 ProductClass가 ITSM인 것들의 totalPrice들의 총합
    private Long itgSummary;

    // OrderReportLicense 중 ProductClass가 DASHBOARD인 것들의 totalPrice들의 총합
    private Long dashboardSummary;

    // OrderReportLicense 중 ProductClass가 DATACENTER, RCA, DCA인 것들의 totalPrice들의 총합
    private Long aiotionSummary;

    private Long emsMaintenanceSummary;

    private Long itgMaintenanceSummary;

    // OrderReportLicense 중 ProductClass가 ITAM인 것들의 totalPrice들의 총합
    private Long itoSummary;

    // OrderReportLicense 중 ProductClass가 앞의 분류에 해당하지 않는것들의 totalPrice들의 총합
    private Long otherSummary;

    public static OrderReport create(
            String orderReportCode,
            OrderReportType type,
            boolean channel,
            CodeType codeType,
            LocalDate contractDate,
            Integer freeMaintenacePeriodMonths,
            LocalDate contractStartDate,
            LocalDate contractEndDate,
            Integer contractPeriodMonths,
            String scopeOfWork,
            String remarks,
            ProjectOpportunity projectOpportunity,
            User pm,
            CompanyManager contractCounterpartManager,
            Company finalCustomerCompany,
            CompanyManager finalCustomerManager
            // Todo: 연관관계 메서드 필요
//            Contract contract,
//            Project project
    ) {
        OrderReport orderReport = new OrderReport();
        orderReport.orderReportCode = orderReportCode;
        orderReport.type = type;
        orderReport.channel = channel;
        orderReport.codeType = codeType;
        orderReport.contractDate = contractDate;
        orderReport.freeMaintenacePeriodMonths = freeMaintenacePeriodMonths;
        orderReport.contractStartDate = contractStartDate;
        orderReport.contractEndDate = contractEndDate;
        orderReport.contractPeriodMonths = contractPeriodMonths;
        orderReport.scopeOfWork = scopeOfWork;
        orderReport.remarks = remarks;
        orderReport.projectOpportunity = projectOpportunity;
        orderReport.pm = pm;
        orderReport.contractCounterpartManager = contractCounterpartManager;
        orderReport.finalCustomerCompany = finalCustomerCompany;
        orderReport.finalCustomerManager = finalCustomerManager;
        orderReport.licenseTotal = 0L;
        orderReport.serviceTotal = 0L;
        orderReport.maintenanceTotal = 0L;
        orderReport.otherTotal = 0L;
        orderReport.purchaseTotal = 0L;
        orderReport.emsSummary = 0L;
        orderReport.itgSummary = 0L;
        orderReport.dashboardSummary = 0L;
        orderReport.aiotionSummary = 0L;
        orderReport.emsMaintenanceSummary = 0L;
        orderReport.itgMaintenanceSummary = 0L;
        orderReport.itoSummary = 0L;
        orderReport.otherSummary = 0L;

        return orderReport;
    }

    public void addLicense(OrderReportLicense license) {
        this.licenses.add(license);
        license.setOrderReport(this);

        calculateLicenseTotal();
        calculateLicenseSummary();
    }

    public void addMaintenance(OrderReportMaintenance maintenance) {
        this.maintenances.add(maintenance);
        maintenance.setOrderReport(this);

        calculateMaintenanceTotal();
    }

    public void addService(OrderReportService service) {
        this.services.add(service);
        service.setOrderReport(this);

        calculateServiceTotal();
    }

    public void addMaintenanceAmount(OrderReportMaintenanceOnlyItem maintenanceAmount) {
        this.maintenanceOnlyItems.add(maintenanceAmount);
        maintenanceAmount.setOrderReport(this);
    }

    public void addOther(OrderReportOther other) {
        this.others.add(other);
        other.setOrderReport(this);

        calculateOtherTotal();
    }

    public void addPurchase(OrderReportPurchase purchase) {
        this.purchases.add(purchase);
        purchase.setOrderReport(this);

        calculatePurchaseTotal();
    }

    private void calculateLicenseTotal() {
        this.licenseTotal = licenses.stream()
                .mapToLong(license -> license.getTotalPrice() == null ? 0L : license.getTotalPrice())
                .sum();
    }

    private void calculateServiceTotal() {
        this.serviceTotal = services.stream()
                .mapToLong(service -> service.getTotalPrice() == null ? 0L : service.getTotalPrice())
                .sum();
    }

    private void calculateMaintenanceTotal() {
        this.maintenanceTotal = maintenances.stream()
                .mapToLong(maintenance -> maintenance.getTotalPrice() == null ? 0L : maintenance.getTotalPrice())
                .sum();
    }

    private void calculateOtherTotal() {
        this.otherTotal = others.stream()
                .mapToLong(other -> other.getTotalPrice() == null ? 0L : other.getTotalPrice())
                .sum();
    }

    private void calculatePurchaseTotal() {
        this.purchaseTotal = purchases.stream()
                .mapToLong(purchase -> purchase.getTotalPrice() == null ? 0L : purchase.getTotalPrice())
                .sum();
    }

    private void calculateLicenseSummary() {
        this.emsSummary = 0L;
        this.itgSummary = 0L;
        this.dashboardSummary = 0L;
        this.aiotionSummary = 0L;
        this.itoSummary = 0L;
        this.otherSummary = 0L;

        for (OrderReportLicense license : licenses) {
            Long price = license.getTotalPrice() == null ? 0L : license.getTotalPrice();

            switch (license.getProductClass()) {
                case EMS -> this.emsSummary += price;
                case ITSM -> this.itgSummary += price;
                case DASHBOARD -> this.dashboardSummary += price;
                case DATACENTER, RCA, DCA -> this.aiotionSummary += price;
                case ITAM -> this.itoSummary += price;
                default -> this.otherSummary += price;
            }
        }
    }

}