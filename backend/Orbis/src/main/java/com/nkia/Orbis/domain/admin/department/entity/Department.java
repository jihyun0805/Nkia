package com.nkia.Orbis.domain.admin.department.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Department extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String headquarters;

    private String team;

    @OneToMany(mappedBy = "department")
    private List<User> users = new ArrayList<>();

    public static Department create(
            String headquarters,
            String team
    ) {
        Department department = new Department();
        department.headquarters = headquarters;
        department.team = team;
        return department;
    }

    public void update(
            String headquarters,
            String team
    ) {
        if (headquarters != null) {
            this.headquarters = headquarters;
        }
        if (team != null) {
            this.team = team;
        }
    }
}