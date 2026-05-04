package com.nkia.Orbis.domain.productmodule.repository;

import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductModuleRepository extends JpaRepository<ProductModule, Long> {
}
