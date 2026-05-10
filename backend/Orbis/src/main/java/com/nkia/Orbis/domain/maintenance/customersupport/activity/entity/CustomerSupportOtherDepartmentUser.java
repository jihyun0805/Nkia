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
import com.nkia.Orbis.domain.admin.user.entity.User;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class CustomerSupportOtherDepartmentUser extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_support_id")
    private CustomerSupport customerSupport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "role_description")
    private String roleDescription; // 활동 내용

    @Builder
    public CustomerSupportOtherDepartmentUser(User user, String roleDescription) {
        this.user = user;
        this.roleDescription = roleDescription;
    }

    protected void assignCustomerSupport(CustomerSupport customerSupport) {
        this.customerSupport = customerSupport;
    }

    public void delete() {
        super.delete();
    }
}