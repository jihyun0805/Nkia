package com.nkia.Orbis.domain.contract.contractsummary.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Contract extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_report_id", unique = true)
    private OrderReport orderReport;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_file_id", unique = true)
    private UploadFile contractFile;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ContractModuleItem> contractModuleItems = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private ProposalType proposalType;

    private Long contractAmount;

    private LocalDate contractDate;

    private String maintenanceCondition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    public static Contract create(
            OrderReport orderReport,
            UploadFile uploadFile,
            ProposalType proposalType,
            Long contractAmount,
            LocalDate contractDate,
            String maintenanceCondition,
            User salesRepresentative
    ) {
        Contract contract = new Contract();
        contract.orderReport = orderReport;

        if (uploadFile != null) {
            contract.contractFile = uploadFile;
        }

        contract.proposalType = proposalType;
        contract.contractAmount = contractAmount;
        contract.contractDate = contractDate;
        contract.maintenanceCondition = maintenanceCondition;
        contract.salesRepresentative = salesRepresentative;

        return contract;
    }

    public void addModuleItem(ContractModuleItem item) {
        this.contractModuleItems.add(item);
        item.setContract(this);
    }
}