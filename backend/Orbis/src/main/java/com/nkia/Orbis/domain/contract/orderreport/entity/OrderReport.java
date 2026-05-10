package com.nkia.Orbis.domain.contract.orderreport.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyManager;
import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.contract.license.entity.License;
import com.nkia.Orbis.domain.project.billing.entity.Billing;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
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
import org.hibernate.annotations.SQLRestriction;


@Entity
@Getter
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String orderReportCode;

    private Long totalAmount;

    private String paymentCondition;

    private boolean quotationProvided;

    private boolean contractProvided;

    private boolean purchaseOrderProvided;

    private boolean prbReportProvided;

    private String additionalDocuments;

    @Enumerated(EnumType.STRING)
    private OrderReportType type;

    private boolean channel;

    @Enumerated(EnumType.STRING)
    private CodeType codeType;

    private LocalDate contractDate;

    private Integer freeMaintenancePeriodMonths;

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
    @JoinColumn(name = "contract_counterpart_company_id")
    private Company contractCounterpartCompany;

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
    private List<License> licenses = new ArrayList<>();

    @OneToMany(mappedBy = "orderReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportServiceItem> services = new ArrayList<>();

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

    // 아래는 유지보수 only 부분의 합계 영역
    private Long itemTotalAmount;

    private Long itemTotalLicense;

    private Long itemTotalThirdParty;

    private Long itemTotalService;

    private Long itemTotalMaintenance;

    private Double itemTotalMaintenanceRate;


    public static OrderReport create(
            String orderReportCode,
            OrderReportType type,
            String paymentCondition,
            boolean quotationProvided,
            boolean contractProvided,
            boolean purchaseOrderProvided,
            boolean prbReportProvided,
            String additionalDocuments,
            boolean channel,
            CodeType codeType,
            LocalDate contractDate,
            Integer freeMaintenancePeriodMonths,
            LocalDate contractStartDate,
            LocalDate contractEndDate,
            Integer contractPeriodMonths,
            String scopeOfWork,
            String remarks,
            ProjectOpportunity projectOpportunity,
            User pm,
            CompanyManager contractCounterpartManager,
            Company finalCustomerCompany,
            CompanyManager finalCustomerManager,
            Double itemTotalMaintenanceRate
            // Todo: 연관관계 메서드 필요
//            Contract contract,
//            Project project
    ) {
        OrderReport orderReport = new OrderReport();
        orderReport.orderReportCode = orderReportCode;
        orderReport.paymentCondition = paymentCondition;
        orderReport.quotationProvided = quotationProvided;
        orderReport.contractProvided = contractProvided;
        orderReport.purchaseOrderProvided = purchaseOrderProvided;
        orderReport.prbReportProvided = prbReportProvided;
        orderReport.additionalDocuments = additionalDocuments;
        orderReport.type = type;
        orderReport.channel = channel;
        orderReport.codeType = codeType;
        orderReport.contractDate = contractDate;
        orderReport.freeMaintenancePeriodMonths = freeMaintenancePeriodMonths;
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
        orderReport.itemTotalMaintenanceRate = itemTotalMaintenanceRate;
        orderReport.totalAmount = 0L;
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
        orderReport.itemTotalAmount = 0L;
        orderReport.itemTotalLicense = 0L;
        orderReport.itemTotalThirdParty = 0L;
        orderReport.itemTotalService = 0L;
        orderReport.itemTotalMaintenance = 0L;

        return orderReport;
    }

    public void addLicense(License license) {
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

    public void addService(OrderReportServiceItem service) {
        this.services.add(service);
        service.setOrderReport(this);

        calculateServiceTotal();
    }

    public void addMaintenanceOnlyItem(OrderReportMaintenanceOnlyItem maintenanceOnlyItem) {
        this.maintenanceOnlyItems.add(maintenanceOnlyItem);
        maintenanceOnlyItem.setOrderReport(this);

        calculateItemTotal();
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

        for (License license : licenses) {
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

    public void calculateTotalAmount() {
        this.totalAmount =
                (licenseTotal == null ? 0L : licenseTotal)
                        + (serviceTotal == null ? 0L : serviceTotal)
                        + (maintenanceTotal == null ? 0L : maintenanceTotal)
                        + (otherTotal == null ? 0L : otherTotal)
                        + (purchaseTotal == null ? 0L : purchaseTotal);
    }

    private void calculateItemTotal() {
        this.itemTotalAmount = maintenanceOnlyItems.stream()
                .mapToLong(item -> item.getAmount() == null ? 0L
                        : item.getAmount())
                .sum();
        this.itemTotalLicense = maintenanceOnlyItems.stream()
                .mapToLong(item -> item.getLicense() == null ? 0L
                        : item.getLicense())
                .sum();
        this.itemTotalThirdParty = maintenanceOnlyItems.stream()
                .mapToLong(item -> item.getThirdParty() == null ? 0L
                        : item.getThirdParty())
                .sum();
        this.itemTotalService = maintenanceOnlyItems.stream()
                .mapToLong(item -> item.getService() == null ? 0L
                        : item.getService())
                .sum();
        this.itemTotalMaintenance = maintenanceOnlyItems.stream()
                .mapToLong(item -> item.getMaintenance() == null ? 0L
                        : item.getMaintenance())
                .sum();
    }

    @Override
    public void delete() {
        super.delete();

        for (License item : licenses) {
            item.delete();
        }

        for (OrderReportMaintenance item : maintenances) {
            item.delete();
        }

        for (OrderReportMaintenanceOnlyItem item : maintenanceOnlyItems) {
            item.delete();
        }

        for (OrderReportOther item : others) {
            item.delete();
        }

        for (OrderReportPurchase item : purchases) {
            item.delete();
        }

        for (OrderReportServiceItem item : services) {
            item.delete();
        }

    }

    public void update(
            OrderReportType type,
            String paymentCondition,
            boolean quotationProvided,
            boolean contractProvided,
            boolean purchaseOrderProvided,
            boolean prbReportProvided,
            String additionalDocuments,
            boolean channel,
            CodeType codeType,
            LocalDate contractDate,
            Integer freeMaintenancePeriodMonths,
            LocalDate contractStartDate,
            LocalDate contractEndDate,
            Integer contractPeriodMonths,
            String scopeOfWork,
            String remarks,
            ProjectOpportunity projectOpportunity,
            User pm,
            CompanyManager contractCounterpartManager,
            Company finalCustomerCompany,
            CompanyManager finalCustomerManager,
            Double itemTotalMaintenanceRate
    ) {
        this.type = type;
        this.paymentCondition = paymentCondition;
        this.quotationProvided = quotationProvided;
        this.contractProvided = contractProvided;
        this.purchaseOrderProvided = purchaseOrderProvided;
        this.prbReportProvided = prbReportProvided;
        this.additionalDocuments = additionalDocuments;
        this.channel = channel;
        this.codeType = codeType;
        this.contractDate = contractDate;
        this.freeMaintenancePeriodMonths = freeMaintenancePeriodMonths;
        this.contractStartDate = contractStartDate;
        this.contractEndDate = contractEndDate;
        this.contractPeriodMonths = contractPeriodMonths;
        this.scopeOfWork = scopeOfWork;
        this.remarks = remarks;
        this.projectOpportunity = projectOpportunity;
        this.pm = pm;
        this.contractCounterpartManager = contractCounterpartManager;
        this.finalCustomerCompany = finalCustomerCompany;
        this.finalCustomerManager = finalCustomerManager;
        this.itemTotalMaintenanceRate = itemTotalMaintenanceRate;
    }

    public void clearItems() {
        this.licenses.clear();
        this.maintenances.clear();
        this.services.clear();
        this.maintenanceOnlyItems.clear();
        this.others.clear();
        this.purchases.clear();

        this.totalAmount = 0L;
        this.licenseTotal = 0L;
        this.serviceTotal = 0L;
        this.maintenanceTotal = 0L;
        this.otherTotal = 0L;
        this.purchaseTotal = 0L;
        this.emsSummary = 0L;
        this.itgSummary = 0L;
        this.dashboardSummary = 0L;
        this.aiotionSummary = 0L;
        this.emsMaintenanceSummary = 0L;
        this.itgMaintenanceSummary = 0L;
        this.itoSummary = 0L;
        this.otherSummary = 0L;
        this.itemTotalAmount = 0L;
        this.itemTotalLicense = 0L;
        this.itemTotalThirdParty = 0L;
        this.itemTotalService = 0L;
        this.itemTotalMaintenance = 0L;
    }
}