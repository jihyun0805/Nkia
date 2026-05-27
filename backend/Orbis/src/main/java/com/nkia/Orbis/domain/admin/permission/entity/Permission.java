package com.nkia.Orbis.domain.admin.permission.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Permission extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private PermissionDomain domain;

    @Enumerated(EnumType.STRING)
    private PermissionAction action;

    public static Permission create(PermissionDomain domain, PermissionAction action) {
        Permission permission = new Permission();
        permission.domain = domain;
        permission.action = action;
        return permission;
    }
}