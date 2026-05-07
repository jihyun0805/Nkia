package com.nkia.Orbis.domain.contract.orderreport.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.contract.license.dto.request.LicenseFromOrderReportRequest;
import com.nkia.Orbis.domain.contract.license.entity.License;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportMaintenanceOnlyItemRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportMaintenanceRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportOtherRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportPurchaseRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.request.OrderReportServiceRequest;
import com.nkia.Orbis.domain.contract.orderreport.dto.response.OrderReportListResponse;
import com.nkia.Orbis.domain.contract.orderreport.dto.response.OrderReportResponse;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportMaintenance;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportMaintenanceOnlyItem;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportOther;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportPurchase;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportServiceItem;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderReportService {

    private final OrderReportRepository orderReportRepository;
    //    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final UserRepository userRepository;
    private final ProductModuleRepository productModuleRepository;

    // TODO: 사업기회, 회사, 회사직원 구현 후 연동 예정
    public OrderReportResponse create(OrderReportRequest request) {

//        ProjectOpportunity projectOpportunity = projectOpportunityRepository.findById(request.getProjectOpportunityId())
//                .orElseThrow(() -> new IllegalArgumentException("사업기회를 찾을 수 없습니다."));

        User pm = userRepository.findById(request.getPmId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        String orderReportCode = generateOrderReportCode();

        OrderReport orderReport = OrderReport.create(
                orderReportCode,
                request.getType(),
                request.getPaymentCondition(),
                request.isQuotationProvided(),
                request.isContractProvided(),
                request.isPurchaseOrderProvided(),
                request.isPrbReportProvided(),
                request.getAdditionalDocuments(),
                request.isChannel(),
                request.getCodeType(),
                request.getContractDate(),
                request.getFreeMaintenancePeriodMonths(),
                request.getContractStartDate(),
                request.getContractEndDate(),
                request.getContractPeriodMonths(),
                request.getScopeOfWork(),
                request.getRemarks(),
                null,
                pm,
                null, // contractCounterpartManager - CompanyManager 구현 후 연결
                null, // finalCustomerCompany - Company 구현 후 연결
                null, // finalCustomerManager - CompanyManager 구현 후 연결
                request.getItemTotalMaintenanceRate()
        );

        if (request.getLicenses() != null) {
            for (LicenseFromOrderReportRequest licenseFromOrderReportRequest : request.getLicenses()) {
                ProductModule productModule = productModuleRepository.findById(
                                licenseFromOrderReportRequest.getProductModuleId())
                        .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

                License license = License.createFromOrderReport(
                        orderReport,
                        productModule,
                        licenseFromOrderReportRequest.getQuantity()
                );

                orderReport.addLicense(license);
            }
        }

        if (request.getMaintenances() != null) {
            for (OrderReportMaintenanceRequest maintenanceRequest : request.getMaintenances()) {
                OrderReportMaintenance maintenance = OrderReportMaintenance.create(
                        maintenanceRequest.getContent(),
                        maintenanceRequest.getVisitCycle(),
                        maintenanceRequest.getMonth(),
                        maintenanceRequest.getPrice()
                );

                orderReport.addMaintenance(maintenance);
            }
        }

        if (request.getServices() != null) {
            for (OrderReportServiceRequest serviceRequest : request.getServices()) {
                OrderReportServiceItem service = OrderReportServiceItem.create(
                        serviceRequest.getContent(),
                        serviceRequest.getManMonth(),
                        serviceRequest.getPrice()
                );

                orderReport.addService(service);
            }
        }

        if (request.getMaintenanceOnlyItems() != null) {
            for (OrderReportMaintenanceOnlyItemRequest itemRequest : request.getMaintenanceOnlyItems()) {
                OrderReportMaintenanceOnlyItem item = OrderReportMaintenanceOnlyItem.create(
                        itemRequest.getYear(),
                        itemRequest.getAmount(),
                        itemRequest.getLicense(),
                        itemRequest.getThirdParty(),
                        itemRequest.getService(),
                        itemRequest.getMaintenance(),
                        itemRequest.getMaintenanceRate()
                );

                orderReport.addMaintenanceOnlyItem(item);
            }
        }

        if (request.getOthers() != null) {
            for (OrderReportOtherRequest otherRequest : request.getOthers()) {
                OrderReportOther other = OrderReportOther.create(
                        otherRequest.getContent(),
                        otherRequest.getQuantity(),
                        otherRequest.getPrice()
                );

                orderReport.addOther(other);
            }
        }

        if (request.getPurchases() != null) {
            for (OrderReportPurchaseRequest purchaseRequest : request.getPurchases()) {
                OrderReportPurchase purchase = OrderReportPurchase.create(
                        purchaseRequest.getContent(),
                        purchaseRequest.getQuantity(),
                        purchaseRequest.getPrice()
                );

                orderReport.addPurchase(purchase);
            }
        }

        orderReport.calculateTotalAmount();
        ;

        OrderReport savedOrderReport = orderReportRepository.save(orderReport);

        return OrderReportResponse.from(savedOrderReport);
    }

    private String generateOrderReportCode() {
        return "OR-" + System.currentTimeMillis();
    }

    @Transactional
    public List<OrderReportListResponse> getOrderReports() {
        return orderReportRepository.findAll()
                .stream()
                .map(OrderReportListResponse::from)
                .toList();
    }

    @Transactional
    public OrderReportResponse getOrderReport(Long orderReportId) {
        OrderReport orderReport = orderReportRepository.findById(orderReportId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND));
        return OrderReportResponse.from(orderReport);
    }

    @Transactional
    public void delete(Long orderReportId) {
        OrderReport orderReport = orderReportRepository.findById(orderReportId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND));
        orderReport.delete();
    }
}