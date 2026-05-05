package com.nkia.Orbis.domain.contract.contract.dto.response;

import com.nkia.Orbis.domain.contract.contract.entity.Contract;
import com.nkia.Orbis.domain.contract.contract.entity.ProposalType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ContractResponse {

    private Long id;

    private Long orderReportId;

    private Long contractFileId;

    private List<ContractModuleItemResponse> contractModuleItems;

    private ProposalType proposalType;

    private Long contractAmount;

    private LocalDate contractDate;

    private String maintenanceCondition;

    private UUID salesRepresentativeId;

    public static ContractResponse from(Contract contract) {
        return ContractResponse.builder()
                .id(contract.getId())
                .orderReportId(contract.getOrderReport().getId())
                .contractFileId(contract.getContractFile() != null ? contract.getContractFile().getId() : null)
                .proposalType(contract.getProposalType())
                .contractAmount(contract.getContractAmount())
                .contractDate(contract.getContractDate())
                .maintenanceCondition(contract.getMaintenanceCondition())
                .salesRepresentativeId(contract.getSalesRepresentative().getId())
                .contractModuleItems(
                        contract.getContractModuleItems()
                                .stream()
                                .map(ContractModuleItemResponse::from)
                                .toList()
                )
                .build();
    }
}
