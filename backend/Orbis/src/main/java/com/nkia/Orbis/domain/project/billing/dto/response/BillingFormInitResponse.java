package com.nkia.Orbis.domain.project.billing.dto.response;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BillingFormInitResponse {

    private String customerName;

    private String projectName;

    private String requesterName;

    private LocalDate requestDate;

    private Long contractId;
}
