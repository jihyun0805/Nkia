package com.nkia.Orbis.domain.user.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.alarm.entity.Alarm;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.department.entity.Department;
import com.nkia.Orbis.domain.maintenance.customersupport.entity.CustomerSupport;
import com.nkia.Orbis.domain.maintenance.customersupport.entity.CustomerSupportOtherDepartmentUser;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.SalesActivityAttendee;
import com.nkia.Orbis.domain.salesactivity.salesactivityrequest.entity.SalesActivityRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class User extends BaseEntity {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "UUID")
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @OneToMany(mappedBy = "user")
    private List<SalesActivityAttendee> salesActivityAttendances = new ArrayList<>();

    @OneToMany(mappedBy = "requestUser")
    private List<SalesActivityRequest> salesActivityRequests = new ArrayList<>();

    @OneToMany(mappedBy = "salesRepresentative")
    private List<Prb> prbs = new ArrayList<>();

    @OneToMany(mappedBy = "pm")
    private List<OrderReport> pmOrderReports = new ArrayList<>();

    @OneToMany(mappedBy = "manager")
    private List<Project> projects = new ArrayList<>();

    @OneToMany(mappedBy = "manager")
    private List<ProjectResultReport> projectResultReports = new ArrayList<>();

    @OneToMany(mappedBy = "primaryManager")
    private List<CustomerSupport> primaryCustomerSupports = new ArrayList<>();

    @OneToMany(mappedBy = "secondaryManager")
    private List<CustomerSupport> secondaryCustomerSupports = new ArrayList<>();

    @OneToMany(mappedBy = "user")
    private List<CustomerSupportOtherDepartmentUser> involvedCustomerSupports = new ArrayList<>();

    @OneToMany(mappedBy = "sender")
    private List<Alarm> sentAlarms = new ArrayList<>();

    @OneToMany(mappedBy = "receiver")
    private List<Alarm> receivedAlarms = new ArrayList<>();

    public static User createUser(String email, String password) {
        return User.builder()
                .email(email)
                .password(password)
                .role(Role.USER)
                .build();
    }
}
