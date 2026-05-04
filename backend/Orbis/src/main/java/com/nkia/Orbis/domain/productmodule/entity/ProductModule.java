package com.nkia.Orbis.domain.productmodule.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunityProductModule;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductModule extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductClass productClass;

    @Column(nullable = false)
    private String productGroup;

    @Column(nullable = false)
    private String productName;

    private String licenseStandard;

    private String licenseUnit;

    private Long unitPrice;

    @OneToMany(mappedBy = "productModule")
    private List<ProjectOpportunityProductModule> projectOpportunityMappings = new ArrayList<>();

//    @OneToMany(mappedBy = "productModule")
//    private List<License> licenses = new ArrayList<>();

    public static ProductModule create(
            ProductClass productClass,
            String productGroup,
            String productName,
            String licenseStandard,
            String licenseUnit,
            Long unitPrice
    ) {
        ProductModule productModule = new ProductModule();
        productModule.productClass = productClass;
        productModule.productGroup = productGroup;
        productModule.productName = productName;
        productModule.licenseStandard = licenseStandard;
        productModule.licenseUnit = licenseUnit;
        productModule.unitPrice = unitPrice;
        return productModule;
    }
}