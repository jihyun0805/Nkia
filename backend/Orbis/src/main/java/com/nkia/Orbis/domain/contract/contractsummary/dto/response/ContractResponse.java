package com.nkia.Orbis.domain.contract.contractsummary.dto.response;

import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.contract.contractsummary.entity.ProposalType;
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

    private String salesRepresentativeName;

    // Todo: 수주보고서, 첨부파일 구현후 연동 예정
    public static ContractResponse from(Contract contract) {
        return ContractResponse.builder()
                .id(contract.getId())
                .orderReportId(contract.getOrderReport() != null ? contract.getOrderReport().getId() : null)
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
                .salesRepresentativeName(contract.getSalesRepresentative().getName())
                .build();
    }
}
