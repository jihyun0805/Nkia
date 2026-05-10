package com.nkia.Orbis.domain.contract.contractsummary.dto.response;

import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.contract.contractsummary.entity.ProposalType;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ContractListResponse {

    private Long id;

    private ProposalType proposalType;

    private Long contractAmount;

    private LocalDate contractDate;

    private UUID salesRepresentativeId;

    private String salesRepresentativeName;

    public static ContractListResponse from(Contract contract) {
        return ContractListResponse.builder()
                .id(contract.getId())
                .proposalType(contract.getProposalType())
                .contractAmount(contract.getContractAmount())
                .contractDate(contract.getContractDate())
                .salesRepresentativeId(contract.getSalesRepresentative().getId())
                .salesRepresentativeName(contract.getSalesRepresentative().getName())
                .build();
    }
}