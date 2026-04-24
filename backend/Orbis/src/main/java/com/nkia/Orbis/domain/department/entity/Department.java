package com.nkia.Orbis.domain.department.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.permission.entity.Permission;
import com.nkia.Orbis.domain.user.entity.User;
import jakarta.persistence.Entity;
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
public class Department extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "department")
    private List<User> users = new ArrayList<>();

    @OneToMany(mappedBy = "department")
    private List<Permission> permissions = new ArrayList<>();
}