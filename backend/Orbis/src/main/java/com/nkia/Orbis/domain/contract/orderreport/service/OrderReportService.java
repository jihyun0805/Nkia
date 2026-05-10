package com.nkia.Orbis.domain.contract.orderreport.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
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
import com.nkia.Orbis.domain.contract.orderreporthistory.dto.response.OrderReportHistoryListResponse;
import com.nkia.Orbis.domain.contract.orderreporthistory.entity.LicenseHistory;
import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportHistory;
import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportMaintenanceHistory;
import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportMaintenanceOnlyItemHistory;
import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportOtherHistory;
import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportPurchaseHistory;
import com.nkia.Orbis.domain.contract.orderreporthistory.entity.OrderReportServiceItemHistory;
import com.nkia.Orbis.domain.contract.orderreporthistory.repository.OrderReportHistoryRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
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
    private final OrderReportHistoryRepository orderReportHistoryRepository;

    // TODO: 사업기회, 회사, 회사직원 구현 후 연동 예정
    public OrderReportResponse create(OrderReportRequest request) {

        return create(
                request,
                generateOrderReportCode(LocalDate.now()));
    }

    private OrderReportResponse create(OrderReportRequest request, String orderReportCode) {

//        ProjectOpportunity projectOpportunity = projectOpportunityRepository.findById(request.getProjectOpportunityId())
//                .orElseThrow(() -> new IllegalArgumentException("사업기회를 찾을 수 없습니다."));

        User pm = userRepository.findById(request.getPmId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

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

        addItems(orderReport, request);

        orderReport.calculateTotalAmount();

        OrderReport savedOrderReport = orderReportRepository.save(orderReport);

        return OrderReportResponse.from(savedOrderReport);
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

    @Transactional
    public OrderReportResponse update(Long orderReportId, OrderReportRequest request) {
        OrderReport orderReport = orderReportRepository.findById(orderReportId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND));

        // 1. 기존 수주보고서 스냅샷 저장
        int nextVersion = orderReportHistoryRepository.countByOrderReportCode(
                orderReport.getOrderReportCode()
        ) + 1;

        OrderReportHistory history = OrderReportHistory.create(orderReport, nextVersion);

        orderReport.getLicenses().forEach(license ->
                history.addLicense(LicenseHistory.create(license))
        );

        orderReport.getMaintenances().forEach(maintenance ->
                history.addMaintenance(OrderReportMaintenanceHistory.create(maintenance))
        );

        orderReport.getServices().forEach(service ->
                history.addService(OrderReportServiceItemHistory.create(service))
        );

        orderReport.getMaintenanceOnlyItems().forEach(item ->
                history.addMaintenanceOnlyItem(OrderReportMaintenanceOnlyItemHistory.create(item))
        );

        orderReport.getOthers().forEach(other ->
                history.addOther(OrderReportOtherHistory.create(other))
        );

        orderReport.getPurchases().forEach(purchase ->
                history.addPurchase(OrderReportPurchaseHistory.create(purchase))
        );

        orderReportHistoryRepository.save(history);

        // 2. 본문 수정
        User pm = userRepository.findById(request.getPmId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        orderReport.update(
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
                null,
                null,
                null,
                request.getItemTotalMaintenanceRate()
        );

        // 3. 기존 하위 엔티티 제거
        orderReport.clearItems();

        // 4. 요청값으로 하위 엔티티 재구성
        addItems(orderReport, request);

        // 5. 최종 합계 계산
        orderReport.calculateTotalAmount();

        return OrderReportResponse.from(orderReport);
    }

    private void addItems(OrderReport orderReport, OrderReportRequest request) {
        if (request.getLicenses() != null) {
            for (LicenseFromOrderReportRequest licenseRequest : request.getLicenses()) {
                ProductModule productModule = productModuleRepository.findById(licenseRequest.getProductModuleId())
                        .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

                orderReport.addLicense(
                        License.createFromOrderReport(orderReport, productModule, licenseRequest.getQuantity())
                );
            }
        }

        if (request.getMaintenances() != null) {
            for (OrderReportMaintenanceRequest maintenanceRequest : request.getMaintenances()) {
                orderReport.addMaintenance(
                        OrderReportMaintenance.create(
                                maintenanceRequest.getContent(),
                                maintenanceRequest.getVisitCycle(),
                                maintenanceRequest.getMonth(),
                                maintenanceRequest.getPrice()
                        )
                );
            }
        }

        if (request.getServices() != null) {
            for (OrderReportServiceRequest serviceRequest : request.getServices()) {
                orderReport.addService(
                        OrderReportServiceItem.create(
                                serviceRequest.getContent(),
                                serviceRequest.getManMonth(),
                                serviceRequest.getPrice()
                        )
                );
            }
        }

        if (request.getMaintenanceOnlyItems() != null) {
            for (OrderReportMaintenanceOnlyItemRequest itemRequest : request.getMaintenanceOnlyItems()) {
                orderReport.addMaintenanceOnlyItem(
                        OrderReportMaintenanceOnlyItem.create(
                                itemRequest.getYear(),
                                itemRequest.getAmount(),
                                itemRequest.getLicense(),
                                itemRequest.getThirdParty(),
                                itemRequest.getService(),
                                itemRequest.getMaintenance(),
                                itemRequest.getMaintenanceRate()
                        )
                );
            }
        }

        if (request.getOthers() != null) {
            for (OrderReportOtherRequest otherRequest : request.getOthers()) {
                orderReport.addOther(
                        OrderReportOther.create(
                                otherRequest.getContent(),
                                otherRequest.getQuantity(),
                                otherRequest.getPrice()
                        )
                );
            }
        }

        if (request.getPurchases() != null) {
            for (OrderReportPurchaseRequest purchaseRequest : request.getPurchases()) {
                orderReport.addPurchase(
                        OrderReportPurchase.create(
                                purchaseRequest.getContent(),
                                purchaseRequest.getQuantity(),
                                purchaseRequest.getPrice()
                        )
                );
            }
        }
    }

    private String generateOrderReportCode(LocalDate orderReportDate) {

        String datePart = orderReportDate.format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = "OR-" + datePart + "-";

        Optional<String> lastCode =
                orderReportRepository.findLastOrderReportCodeIncludingDeleted(prefix);

        int nextNumber = lastCode
                .map(code -> {
                    String numberPart = code.substring(code.lastIndexOf("-") + 1);
                    return Integer.parseInt(numberPart) + 1;
                })
                .orElse(1);

        return prefix + String.format("%04d", nextNumber);
    }

    @Transactional
    public List<OrderReportHistoryListResponse> getOrderReportHistories(Long orderReportId) {
        OrderReport orderReport = orderReportRepository.findById(orderReportId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND));

        List<OrderReportHistory> histories =
                orderReportHistoryRepository.findByOrderReportCodeOrderByVersionDesc(
                        orderReport.getOrderReportCode()
                );

        if (histories.isEmpty()) {
            throw new ApiException(ContractErrorCode.ORDER_REPORT_NOT_FOUND);
        }

        return histories.stream()
                .map(OrderReportHistoryListResponse::from)
                .toList();
    }
}