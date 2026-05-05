package com.nkia.Orbis.domain.contract.contract.dto.request;

import com.nkia.Orbis.domain.contract.contract.entity.ProposalType;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Getter;

@Getter
public class ContractCreateRequest {
    private Long orderReportId;

    private Long contractFileId;

    @Valid
    private List<ContractModuleItemCreateRequest> contractModuleItems;

    private ProposalType proposalType;

    private Long contractAmount;

    private LocalDate contractDate;

    private String maintenanceCondition;

    private UUID salesRepresentativeId;
}
