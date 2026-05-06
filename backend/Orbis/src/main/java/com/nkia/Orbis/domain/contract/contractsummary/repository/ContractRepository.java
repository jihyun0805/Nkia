package com.nkia.Orbis.domain.contract.contractsummary.repository;

import com.nkia.Orbis.domain.contract.contractsummary.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractRepository extends JpaRepository<Contract, Long> {
}
