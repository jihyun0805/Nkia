package com.nkia.Orbis.domain.contract.license.repository;

import com.nkia.Orbis.domain.contract.license.entity.License;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LicenseRepository extends JpaRepository<License, Long> {
}
