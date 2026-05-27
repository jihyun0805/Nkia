package com.nkia.Orbis.domain.contract.contractsummary.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ContractModuleItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_module_id", nullable = false)
    private ProductModule productModule;

    private String productModuleName;

    @Enumerated(EnumType.STRING)
    private ProductClass productClass;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Long unitPrice;

    @Column(nullable = false)
    private Long totalPrice;

    public static ContractModuleItem create(
            ProductModule productModule,
            Integer quantity
    ) {
        ContractModuleItem contractModuleItem = new ContractModuleItem();
        contractModuleItem.productModule = productModule;
        contractModuleItem.productModuleName = productModule.getProductName();
        contractModuleItem.productClass = productModule.getProductClass();
        contractModuleItem.quantity = quantity;
        contractModuleItem.unitPrice = productModule.getUnitPrice();
        contractModuleItem.totalPrice = quantity * contractModuleItem.unitPrice;

        return contractModuleItem;
    }

    void setContract(Contract contract) {
        this.contract = contract;
    }
}
