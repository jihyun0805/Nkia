package com.nkia.Orbis.domain.user.dto.request;

import com.nkia.Orbis.domain.user.entity.Position;
import com.nkia.Orbis.domain.user.entity.Role;
import com.nkia.Orbis.domain.user.entity.Status;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserUpdateRequest {

    private String employeeNumber;

    private Position position;

    private String name;

    private String phone;

    private Role role;

    private Status status;

    private Long departmentId;
}