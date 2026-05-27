package com.nkia.Orbis.domain.contract.contractsummary.dto.request;

import com.nkia.Orbis.domain.contract.contractsummary.entity.ProposalType;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Getter;

@Getter
public class ContractRequest {
    private Long orderReportId;

    private Long contractFileId;

    @Valid
    private List<ContractModuleItemRequest> contractModuleItems;

    private ProposalType proposalType;

    private Long contractAmount;

    private LocalDate contractDate;

    private String maintenanceCondition;

    private UUID salesRepresentativeId;
}
