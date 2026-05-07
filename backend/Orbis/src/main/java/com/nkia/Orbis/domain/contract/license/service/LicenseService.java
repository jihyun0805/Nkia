package com.nkia.Orbis.domain.contract.license.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.CompanyErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.domain.company.entity.Company;
import com.nkia.Orbis.domain.company.repository.CompanyRepository;
import com.nkia.Orbis.domain.contract.license.dto.request.LicenseRequest;
import com.nkia.Orbis.domain.contract.license.dto.response.LicenseListResponse;
import com.nkia.Orbis.domain.contract.license.dto.response.LicenseResponse;
import com.nkia.Orbis.domain.contract.license.entity.License;
import com.nkia.Orbis.domain.contract.license.repository.LicenseRepository;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.productmodule.repository.ProductModuleRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LicenseService {

    private final LicenseRepository licenseRepository;
    private final CompanyRepository companyRepository;
    private final ProductModuleRepository productModuleRepository;

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

        return LicenseResponse.from(savedLicense);
    }

    @Transactional
    public List<LicenseListResponse> getlicenses() {
        return licenseRepository.findAll()
                .stream()
                .map(LicenseListResponse::from)
                .toList();
    }
}