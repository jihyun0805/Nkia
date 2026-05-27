package com.nkia.Orbis.domain.company.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class CompanyManager extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 100, unique = true)
    private String email;

    private String mobilePhone;

    private String officePhone;

    @Column(length = 50)
    private String department;

    private String position;

    private String role;

    /**
     * 💡 연관관계 편의 메서드 (핵심!) Manager에 Company를 세팅하면서, 동시에 Company의 managers 리스트에도 자신을 추가합니다.
     */
    public void assignCompany(Company company) {
        // 기존에 연결된 회사가 있다면 그 회사의 리스트에서 나를 제거 (안전장치)
        if (this.company != null) {
            this.company.getManagers().remove(this);
        }

        this.company = company;

        // 새로 연결할 회사의 리스트에 나를 추가 (메모리 동기화)
        if (company != null && !company.getManagers().contains(this)) {
            company.getManagers().add(this);
        }
    }

    // Builder 패턴을 쓸 때도 연관관계 편의 메서드를 타도록 커스텀 생성자를 만듭니다.
    @Builder
    public CompanyManager(Company company, String name, String email, String mobilePhone, String officePhone,
                          String department, String position, String role) {
        this.name = name;
        this.email = email;
        this.mobilePhone = mobilePhone;
        this.officePhone = officePhone;
        this.department = department;
        this.position = position;
        this.role = role;

        // 단순 대입(this.company = company) 대신 편의 메서드 호출
        if (company != null) {
            this.assignCompany(company);
        }
    }

    public void updateInfo(String name, String mobilePhone, String officePhone, String department, String position,
                           String role) {
        this.name = name;
        this.mobilePhone = mobilePhone;
        this.officePhone = officePhone;
        this.department = department;
        this.position = position;
        this.role = role;
    }
}
