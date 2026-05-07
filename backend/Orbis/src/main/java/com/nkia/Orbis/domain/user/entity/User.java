package com.nkia.Orbis.domain.user.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivityAttendee;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.alarm.entity.Alarm;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.department.entity.Department;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
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
    private String employeeNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Position position;

    @Column(nullable = false)
    private String name;

    private String phone;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Builder.Default
    @OneToMany(mappedBy = "user")
    private List<SalesActivityAttendee> salesActivityAttendances = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "targetUser")
    private List<SalesActivityRequest> salesActivityRequests = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "salesRepresentative")
    private List<Prb> prbs = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "pm")
    private List<OrderReport> pmOrderReports = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "manager")
    private List<Project> projects = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "manager")
    private List<ProjectResultReport> projectResultReports = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "sender")
    private List<Alarm> sentAlarms = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "receiver")
    private List<Alarm> receivedAlarms = new ArrayList<>();

    public static User createUser(
            String employeeNumber,
            Position position,
            String name,
            String phone,
            String email,
            String password,
            Role role,
            Status status,
            Department department
    ) {
        return User.builder()
                .employeeNumber(employeeNumber)
                .position(position)
                .name(name)
                .phone(phone)
                .email(email)
                .password(password)
                .role(role)
                .status(status)
                .department(department)
                .build();
    }

    public void update(
            String employeeNumber,
            Position position,
            String name,
            String phone,
            Role role,
            Status status,
            Department department
    ) {
        this.employeeNumber = employeeNumber;
        this.position = position;
        this.name = name;
        this.phone = phone;
        this.role = role;
        this.status = status;
        this.department = department;
    }
}
