package com.nkia.Orbis.domain.contract.contractsummary.dto.response;

import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import com.nkia.Orbis.domain.contract.contractsummary.entity.ProposalType;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ContractListResponse {

    private Long id;

    private ProposalType proposalType;

    private Long contractAmount;

    private LocalDate contractDate;

    private String salesRepresentativeName;

    public static ContractListResponse from(Contract contract) {
        return ContractListResponse.builder()
                .id(contract.getId())
                .proposalType(contract.getProposalType())
                .contractAmount(contract.getContractAmount())
                .contractDate(contract.getContractDate())
                .salesRepresentativeName(contract.getSalesRepresentative().getName())
                .build();
    }
}