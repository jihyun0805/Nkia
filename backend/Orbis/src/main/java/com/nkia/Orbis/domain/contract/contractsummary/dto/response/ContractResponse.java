package com.nkia.Orbis.domain.contract.contractsummary.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ContractResponse {

    private Long id;

    private Long workflowId;

    private ApprovalStatus status;

    private Long orderReportId;

    private Long contractFileId;

    private List<ContractModuleItemResponse> contractModuleItems;

    private String proposalType;

    private Long contractAmount;

    private LocalDate contractDate;

    private String maintenanceCondition;

    private UUID salesRepresentativeId;

    private String salesRepresentativeName;

    public static ContractResponse from(Contract contract, Long workflowId) {
        return ContractResponse.builder()
                .id(contract.getId())
                .orderReportId(contract.getOrderReport() != null ? contract.getOrderReport().getId() : null)
                .contractFileId(contract.getContractFile() != null ? contract.getContractFile().getId() : null)
                .proposalType(contract.getProposalType().getDescription())
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
                .status(contract.getStatus())
                .workflowId(workflowId)
                .build();
    }
}
