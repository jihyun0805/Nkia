package com.nkia.Orbis.domain.productmodule.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.domain.productmodule.dto.request.ProductModuleCreateRequest;
import com.nkia.Orbis.domain.productmodule.dto.response.ProductModuleResponse;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.productmodule.repository.ProductModuleRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductModuleService {
    private final ProductModuleRepository productModuleRepository;

    @Transactional
    public ProductModuleResponse create(ProductModuleCreateRequest request) {
        ProductModule productModule = ProductModule.create(
                request.getProductClass(),
                request.getProductGroup(),
                request.getProductName(),
                request.getLicenseStandard(),
                request.getLicenseUnit(),
                request.getUnitPrice()
        );

        productModuleRepository.save(productModule);

        return ProductModuleResponse.from(productModule);
    }

    @Transactional
    public void delete(Long productModuleId) {
        ProductModule productModule = productModuleRepository.findById(productModuleId)
                .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

        productModule.delete();
    }

    @Transactional
    public List<ProductModuleResponse> getProductModules() {
        return productModuleRepository.findAll()
                .stream()
                .map(ProductModuleResponse::from)
                .toList();
    }
}
