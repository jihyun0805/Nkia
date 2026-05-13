package com.nkia.Orbis.domain.contract.orderreporthistory.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.entity.CompanyManager;
import com.nkia.Orbis.domain.contract.orderreport.entity.CodeType;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportType;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
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
public class OrderReportHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer version;

    @Column(nullable = false)
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

    @OneToMany(mappedBy = "orderReportHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportMaintenanceHistory> maintenances = new ArrayList<>();

    @OneToMany(mappedBy = "orderReportHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LicenseHistory> licenses = new ArrayList<>();

    @OneToMany(mappedBy = "orderReportHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportServiceItemHistory> services = new ArrayList<>();

    @OneToMany(mappedBy = "orderReportHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportMaintenanceOnlyItemHistory> maintenanceOnlyItems = new ArrayList<>();

    @OneToMany(mappedBy = "orderReportHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportOtherHistory> others = new ArrayList<>();

    @OneToMany(mappedBy = "orderReportHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderReportPurchaseHistory> purchases = new ArrayList<>();

    // OrderReportLicense totalPrice들의 총합
    private Long licenseTotal;

    // OrderReportService totalPrice들의 총합
    private Long serviceTotal;

    // OrderReportMaintenance totalPrice들의 총합
    private Long maintenanceTotal;

    // OrderReportOther totalPrice들의 총합
    private Long otherTotal;

    // Purchase totalPrice들의 총합
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

    private LocalDateTime orderReportDate;

    public static OrderReportHistory create(
            OrderReport orderReport,
            Integer version
    ) {
        OrderReportHistory orderReportHistory = new OrderReportHistory();
        orderReportHistory.orderReportCode = orderReport.getOrderReportCode();
        orderReportHistory.version = version;
        orderReportHistory.totalAmount = orderReport.getTotalAmount();
        orderReportHistory.paymentCondition = orderReport.getPaymentCondition();
        orderReportHistory.quotationProvided = orderReport.isQuotationProvided();
        orderReportHistory.contractProvided = orderReport.isContractProvided();
        orderReportHistory.purchaseOrderProvided = orderReport.isPurchaseOrderProvided();
        orderReportHistory.prbReportProvided = orderReport.isPrbReportProvided();
        orderReportHistory.additionalDocuments = orderReport.getAdditionalDocuments();
        orderReportHistory.type = orderReport.getType();
        orderReportHistory.channel = orderReport.isChannel();
        orderReportHistory.codeType = orderReport.getCodeType();
        orderReportHistory.contractDate = orderReport.getContractDate();
        orderReportHistory.freeMaintenancePeriodMonths = orderReport.getFreeMaintenancePeriodMonths();
        orderReportHistory.contractStartDate = orderReport.getContractStartDate();
        orderReportHistory.contractEndDate = orderReport.getContractEndDate();
        orderReportHistory.contractPeriodMonths = orderReport.getContractPeriodMonths();
        orderReportHistory.scopeOfWork = orderReport.getScopeOfWork();
        orderReportHistory.remarks = orderReport.getRemarks();
        orderReportHistory.projectOpportunity = orderReport.getProjectOpportunity();
        orderReportHistory.pm = orderReport.getPm();
        orderReportHistory.contractCounterpartCompany = orderReport.getContractCounterpartCompany();
        orderReportHistory.contractCounterpartManager = orderReport.getContractCounterpartManager();
        orderReportHistory.finalCustomerCompany = orderReport.getFinalCustomerCompany();
        orderReportHistory.finalCustomerManager = orderReport.getFinalCustomerManager();
        orderReportHistory.licenseTotal = orderReport.getLicenseTotal();
        orderReportHistory.serviceTotal = orderReport.getServiceTotal();
        orderReportHistory.maintenanceTotal = orderReport.getMaintenanceTotal();
        orderReportHistory.otherTotal = orderReport.getOtherTotal();
        orderReportHistory.purchaseTotal = orderReport.getPurchaseTotal();
        orderReportHistory.emsSummary = orderReport.getEmsSummary();
        orderReportHistory.itgSummary = orderReport.getItgSummary();
        orderReportHistory.dashboardSummary = orderReport.getDashboardSummary();
        orderReportHistory.aiotionSummary = orderReport.getAiotionSummary();
        orderReportHistory.emsMaintenanceSummary = orderReport.getEmsMaintenanceSummary();
        orderReportHistory.itgMaintenanceSummary = orderReport.getItgMaintenanceSummary();
        orderReportHistory.itoSummary = orderReport.getItoSummary();
        orderReportHistory.otherSummary = orderReport.getOtherSummary();
        orderReportHistory.itemTotalAmount = orderReport.getItemTotalAmount();
        orderReportHistory.itemTotalLicense = orderReport.getItemTotalLicense();
        orderReportHistory.itemTotalThirdParty = orderReport.getItemTotalThirdParty();
        orderReportHistory.itemTotalService = orderReport.getItemTotalService();
        orderReportHistory.itemTotalMaintenance = orderReport.getItemTotalMaintenance();
        orderReportHistory.itemTotalMaintenanceRate = orderReport.getItemTotalMaintenanceRate();
        orderReportHistory.orderReportDate = orderReport.getCreatedAt();

        return orderReportHistory;
    }

    public void addLicense(LicenseHistory license) {
        this.licenses.add(license);
        license.setOrderReportHistory(this);
    }

    public void addMaintenance(OrderReportMaintenanceHistory maintenance) {
        this.maintenances.add(maintenance);
        maintenance.setOrderReportHistory(this);
    }

    public void addService(OrderReportServiceItemHistory service) {
        this.services.add(service);
        service.setOrderReportHistory(this);
    }

    public void addMaintenanceOnlyItem(OrderReportMaintenanceOnlyItemHistory maintenanceOnlyItem) {
        this.maintenanceOnlyItems.add(maintenanceOnlyItem);
        maintenanceOnlyItem.setOrderReportHistory(this);

    }

    public void addOther(OrderReportOtherHistory other) {
        this.others.add(other);
        other.setOrderReportHistory(this);
    }

    public void addPurchase(OrderReportPurchaseHistory purchase) {
        this.purchases.add(purchase);
        purchase.setOrderReportHistory(this);
    }

    @Override
    public void delete() {
        super.delete();

        for (LicenseHistory item : licenses) {
            item.delete();
        }

        for (OrderReportMaintenanceHistory item : maintenances) {
            item.delete();
        }

        for (OrderReportMaintenanceOnlyItemHistory item : maintenanceOnlyItems) {
            item.delete();
        }

        for (OrderReportOtherHistory item : others) {
            item.delete();
        }

        for (OrderReportPurchaseHistory item : purchases) {
            item.delete();
        }

        for (OrderReportServiceItemHistory item : services) {
            item.delete();
        }

    }
}