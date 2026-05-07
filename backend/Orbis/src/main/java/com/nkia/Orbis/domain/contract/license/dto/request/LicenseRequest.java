package com.nkia.Orbis.domain.contract.license.dto.request;

import com.nkia.Orbis.domain.contract.license.entity.LicenseType;
import java.time.LocalDate;
import lombok.Getter;

@Getter
public class LicenseRequest {

    private Long productModuleId;

    private Integer quantity;

    private LicenseType licenseType;

    private Long customerCompanyId;

    private LocalDate startDate;

    private LocalDate endDate;
}
