package com.nkia.Orbis.domain.maintenance.customersupport.activity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomerSupportOtherDepartmentUser extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_support_id")
    private CustomerSupport customerSupport;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "role_description")
    private String roleDescription; // 활동 내용

    @Builder
    public CustomerSupportOtherDepartmentUser(UUID userId, String roleDescription) {
        this.userId = userId;
        this.roleDescription = roleDescription;
    }

    protected void assignCustomerSupport(CustomerSupport customerSupport) {
        this.customerSupport = customerSupport;
    }
}