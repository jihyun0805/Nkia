package com.nkia.Orbis.domain.maintenance.maintenancequotation.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.MaintenanceErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.request.MaintenanceQuotationCreateRequest;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.dto.response.QuotationCreateResponse;
import com.nkia.Orbis.domain.maintenance.maintenancequotation.entity.MaintenanceAmountReason;
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
    public QuotationCreateResponse register(MaintenanceQuotationCreateRequest dto) {
        // 1. 검증 및 부모 엔티티 생성
        Project project = projectRepository.findById(dto.getProjectId())
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));

        if (quotationRepository.existsByRefNo(dto.getRefNo())) {
            throw new ApiException(MaintenanceErrorCode.QUOTATION_ALREADY_EXISTS);
        }

        MaintenanceQuotation quotation = createQuotationEntity(dto, project);

        // 2. 하위 엔티티 매핑
        if (dto.getServiceInfos() != null) {
            dto.getServiceInfos().forEach(s -> quotation.addServiceDetail(createServiceInfo(s)));
        }

        if (dto.getAmountReasons() != null) {
            dto.getAmountReasons().forEach(c -> quotation.addCostBasis(createAmountReason(c)));
        }

        // 3. 저장
        MaintenanceQuotation savedQuotation = quotationRepository.save(quotation);

        // 4. 응답 반환
        return QuotationCreateResponse.builder()
                .id(savedQuotation.getId())
                .refNo(savedQuotation.getRefNo())
                .quotationDate(savedQuotation.getQuotationDate())
                .totalQuotationAmount(savedQuotation.getTotalQuotationAmount())
                .build();
    }

    /**
     * 견적서 부모 엔티티 생성
     */
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
                .spMaintenanceCost(dto.getSpMaintenanceCost())
                .build();
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
}
