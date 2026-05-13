package com.nkia.Orbis.domain.contract.contractsummary.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
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
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Contract extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

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
        contract.status = ApprovalStatus.DRAFT;

        return contract;
    }

    public void addModuleItem(ContractModuleItem item) {
        this.contractModuleItems.add(item);
        item.setContract(this);
    }

    public void update(
            OrderReport orderReport,
            UploadFile contractFile,
            ProposalType proposalType,
            Long contractAmount,
            LocalDate contractDate,
            String maintenanceCondition,
            User salesRepresentative
    ) {
        if (orderReport != null) {
            this.orderReport = orderReport;
        }
        if (contractFile != null) {
            this.contractFile = contractFile;
        }
        if (proposalType != null) {
            this.proposalType = proposalType;
        }
        if (contractAmount != null) {
            this.contractAmount = contractAmount;
        }
        if (contractDate != null) {
            this.contractDate = contractDate;
        }
        if (maintenanceCondition != null) {
            this.maintenanceCondition = maintenanceCondition;
        }
        if (salesRepresentative != null) {
            this.salesRepresentative = salesRepresentative;
        }
    }

    public void clearModuleItems() {
        this.contractModuleItems.clear();
    }

    @Override
    public void delete() {
        super.delete();

        for (ContractModuleItem item : contractModuleItems) {
            item.delete();
        }
    }

    public void submit() {
        this.status = ApprovalStatus.PENDING;
    }

    public void approve() {
        this.status = ApprovalStatus.APPROVED;
    }

    public void reject() {
        this.status = ApprovalStatus.REJECTED;
    }

    public void cancel() {
        this.status = ApprovalStatus.CANCELED;
    }

    public boolean isDraft() {
        return this.status == ApprovalStatus.DRAFT;
    }
}