package com.nkia.Orbis.domain.contract.license.dto.request;

import com.nkia.Orbis.domain.contract.license.entity.LicenseStatus;
import com.nkia.Orbis.domain.contract.license.entity.LicenseType;
import java.time.LocalDate;
import lombok.Getter;

@Getter
public class LicenseUpdateRequest {

    private Long customerCompanyId;

    private Long productModuleId;

    private Integer quantity;

    private LicenseType licenseType;

    private LicenseStatus licenseStatus;

    private LocalDate startDate;

    private LocalDate endDate;
}
