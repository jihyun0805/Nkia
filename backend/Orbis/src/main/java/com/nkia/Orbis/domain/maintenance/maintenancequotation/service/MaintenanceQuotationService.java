package com.nkia.Orbis.domain.maintenance.maintenancequotation.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request.MaintenanceQuotationCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request.MaintenanceQuotationUpdateRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response.MaintenanceQuotationCreateResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response.MaintenanceQuotationDetailResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceAmountReason;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenancePackageCost;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceQuotation;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceServiceInfo;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ServiceCategory;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.ServiceItem;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.repository.MaintenanceQuotationRepository;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MaintenanceQuotationService {

    private final MaintenanceQuotationRepository quotationRepository;
    private final ProjectRepository projectRepository;
    private final ProductModuleRepository productModuleRepository;

    /**
     * 유지보수 견적서 등록
     */
    @Transactional
    public MaintenanceQuotationCreateResponse register(MaintenanceQuotationCreateRequest dto) {
        Project project = findProject(dto.getProjectId());
        MaintenanceQuotation quotation = createQuotationEntity(dto, project);

        mapSubEntities(dto, quotation);

        MaintenanceQuotation saved = quotationRepository.save(quotation);
        return MaintenanceQuotationCreateResponse.from(saved);
    }

    /**
     * 유지보수 견적서 정보 수정
     */
    @Transactional
    public MaintenanceQuotationDetailResponse update(Long id, MaintenanceQuotationUpdateRequest dto) {
        MaintenanceQuotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.QUOTATION_NOT_FOUND));

        updateBasicInfo(quotation, dto);
        refreshChildEntities(quotation, dto);

        return MaintenanceQuotationDetailResponse.from(quotation);
    }

    /**
     * 유지보수 견적서 삭제
     */
    @Transactional
    public void delete(Long id) {
        MaintenanceQuotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.QUOTATION_NOT_FOUND));

        quotation.delete();
    }

    private MaintenanceQuotation createQuotationEntity(MaintenanceQuotationCreateRequest dto, Project project) {
        return MaintenanceQuotation.builder()
                .refNo(dto.getRefNo())
                .project(project)
                .quotationDate(dto.getQuotationDate())
                .paymentTerms(dto.getPaymentTerms())
                .totalAmount(dto.getTotalAmount())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .monthlySupplyPrice(dto.getMonthlySupplyPrice())
                .totalQuotationAmount(dto.getTotalQuotationAmount())
                .specialNotes(dto.getSpecialNotes())
                .build();
    }

    private void mapSubEntities(MaintenanceQuotationCreateRequest dto, MaintenanceQuotation quotation) {
        dto.getPackageCosts().forEach(p ->
                quotation.addPackageCost(new MaintenancePackageCost(p.getPackageName(), p.getAmount())));

        dto.getServiceInfos().forEach(s ->
                quotation.addServiceDetail(createServiceInfo(s)));

        dto.getAmountReasons().forEach(a ->
                quotation.addCostBasis(createAmountReason(a)));
    }

    private Project findProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));
    }

    /**
     * 서비스 내역 하위 엔티티 생성
     */
    private MaintenanceServiceInfo createServiceInfo(MaintenanceQuotationCreateRequest.ServiceInfoRequest s) {
        return MaintenanceServiceInfo.builder()
                .productModule(getProductModuleOrNull(s.getProductId()))
                .category(ServiceCategory.fromDescription(s.getCategory()))
                .item(ServiceItem.fromDescription(s.getItem()))
                .content(s.getContent())
                .build();
    }

    /**
     * 금액 산출 근거 하위 엔티티 생성
     */
    private MaintenanceAmountReason createAmountReason(MaintenanceQuotationCreateRequest.AmountReasonRequest c) {
        return MaintenanceAmountReason.builder()
                .productModule(getProductModuleOrNull(c.getProductId()))
                .quantity(c.getQuantity())
                .amount(c.getAmount())
                .months(c.getMonths())
                .remarks(c.getRemarks())
                .build();
    }

    /**
     * 제품 모듈 조회
     */
    private ProductModule getProductModuleOrNull(Long productId) {
        if (productId == null) {
            return null;
        }
        return productModuleRepository.findById(productId)
                .orElseThrow(() -> new ApiException(MaintenanceErrorCode.MODULE_NOT_FOUND));
    }

    private void updateBasicInfo(MaintenanceQuotation q, MaintenanceQuotationUpdateRequest dto) {
        q.updateInfo(dto.getPaymentTerms(), dto.getTotalAmount(),
                dto.getStartDate(), dto.getEndDate(),
                dto.getMonthlySupplyPrice(), dto.getTotalQuotationAmount(),
                dto.getSpecialNotes());
    }

    private void refreshChildEntities(MaintenanceQuotation q, MaintenanceQuotationUpdateRequest dto) {
        q.getPackageCosts().clear();
        dto.getPackageCosts().forEach(p -> q.addPackageCost(new MaintenancePackageCost(p.getPackageName(), p.getAmount())));

        q.getServiceInfos().clear();
        dto.getServiceInfos().forEach(s -> q.addServiceDetail(createServiceInfo(s)));

        q.getAmountReasons().clear();
        dto.getAmountReasons().forEach(a -> q.addCostBasis(createAmountReason(a)));
    }
}
