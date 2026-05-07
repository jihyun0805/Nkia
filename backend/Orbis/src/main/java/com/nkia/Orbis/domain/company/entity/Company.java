package com.nkia.Orbis.domain.company.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "company", indexes = {
        @Index(name = "idx_company_code", columnList = "code"),
        @Index(name = "idx_company_brn", columnList = "business_registration_number"),
        @Index(name = "idx_company_name_type", columnList = "name, company_type")
})
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class Company extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    private CompanyType companyType;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "business_registration_number", unique = true)
    private String businessRegistrationNumber;

    // 고객군 (공공, 민간, 해외)
    @Enumerated(EnumType.STRING)
    private Sector sector;

    // 고객 구분 (SI, 직접사용 등)
    @Enumerated(EnumType.STRING)
    private CompanyCategory category;

    private String address;

    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompanyManager> managers = new ArrayList<>();

    public void updateInfo(String name, Sector sector, CompanyCategory category, String address) {
        this.name = name;
        this.sector = sector;
        this.category = category;
        this.address = address;
    }
}