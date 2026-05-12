package com.nkia.Orbis.domain.contract.license.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.repository.CompanyRepository;
import com.nkia.Orbis.domain.contract.license.dto.request.LicenseRequest;
import com.nkia.Orbis.domain.contract.license.dto.request.LicenseUpdateRequest;
import com.nkia.Orbis.domain.contract.license.dto.response.LicenseListResponse;
import com.nkia.Orbis.domain.contract.license.dto.response.LicenseResponse;
import com.nkia.Orbis.domain.contract.license.entity.License;
import com.nkia.Orbis.domain.contract.license.repository.LicenseRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LicenseService {

    private final LicenseRepository licenseRepository;
    private final CompanyRepository companyRepository;
    private final ProductModuleRepository productModuleRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowService workflowService;

    public LicenseResponse create(LicenseRequest request) {
        Company customerCompany = companyRepository.findById(request.getCustomerCompanyId())
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));

        ProductModule productModule = productModuleRepository.findById(request.getProductModuleId())
                .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

        License license = License.create(
                customerCompany,
                productModule,
                request.getQuantity(),
                request.getLicenseType(),
                request.getStartDate(),
                request.getEndDate()
        );

        License savedLicense = licenseRepository.save(license);

        return LicenseResponse.from(savedLicense, getWorkflowId(savedLicense.getId()));
    }

    @Transactional
    public List<LicenseListResponse> getLicenses() {
        return licenseRepository.findAll()
                .stream()
                .map(LicenseListResponse::from)
                .toList();
    }

    @Transactional
    public LicenseResponse getLicense(Long licenseId) {
        License license = licenseRepository.findById(licenseId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.LICENSE_NOT_FOUND));

        return LicenseResponse.from(license, getWorkflowId(license.getId()));
    }

    @Transactional
    public void delete(Long licenseId) {
        License license = licenseRepository.findById(licenseId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.LICENSE_NOT_FOUND));

        license.delete();
    }

    @Transactional
    public LicenseResponse update(Long licenseId, LicenseUpdateRequest request) {
        License license = licenseRepository.findById(licenseId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.LICENSE_NOT_FOUND));

        if (license.getOrderReport() != null) {
            throw new ApiException(ContractErrorCode.LICENSE_UPDATE_NOT_ALLOWED);
        }

        Company customerCompany = companyRepository.findById(request.getCustomerCompanyId())
                .orElseThrow(() -> new ApiException(CompanyErrorCode.COMPANY_NOT_FOUND));

        ProductModule productModule = productModuleRepository.findById(request.getProductModuleId())
                .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

        license.update(
                customerCompany,
                productModule,
                request.getQuantity(),
                request.getLicenseType(),
                request.getLicenseStatus(),
                request.getStartDate(),
                request.getEndDate()
        );

        return LicenseResponse.from(license, getWorkflowId(license.getId()));
    }

    @Transactional
    public void submitLicense(
            Long licenseId,
            UUID firstApproverId
    ) {
        License license = licenseRepository.findById(licenseId)
                .orElseThrow(() -> new ApiException(ContractErrorCode.LICENSE_NOT_FOUND));

        if (!license.isDraft()) {
            throw new ApiException(ContractErrorCode.INVALID_LICENSE_STATUS);
        }

        UUID requesterId = UUID.fromString(SecurityUtil.getCurrentUserId());

        Workflow workflow = workflowService.startWorkflow(
                WorkflowDomain.LICENSE,
                license.getId(),
                requesterId,
                firstApproverId
        );

        license.submit();
    }

    private Long getWorkflowId(Long licenseId) {

        return workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        WorkflowDomain.LICENSE,
                        licenseId,
                        WorkflowStatus.IN_PROGRESS
                )
                .map(Workflow::getId)
                .orElse(null);
    }

}