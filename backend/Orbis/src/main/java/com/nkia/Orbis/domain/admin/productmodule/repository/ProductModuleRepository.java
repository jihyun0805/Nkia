package com.nkia.Orbis.domain.admin.productmodule.repository;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductModuleRepository extends JpaRepository<ProductModule, Long> {

    boolean existsByProductClassAndProductGroupAndProductNameAndLicenseStandard(
            ProductClass productClass,
            String productGroup,
            String productName,
            String licenseStandard
    );
}
