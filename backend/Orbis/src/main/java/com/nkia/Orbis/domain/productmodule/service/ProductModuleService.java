package com.nkia.Orbis.domain.productmodule.service;

import com.nkia.Orbis.domain.productmodule.dto.request.ProductModuleCreateRequest;
import com.nkia.Orbis.domain.productmodule.dto.response.ProductModuleResponse;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.productmodule.repository.ProductModuleRepository;
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
}
