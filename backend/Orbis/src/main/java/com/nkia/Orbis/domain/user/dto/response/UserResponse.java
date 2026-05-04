package com.nkia.Orbis.domain.user.dto.response;

import com.nkia.Orbis.domain.user.entity.Position;
import com.nkia.Orbis.domain.user.entity.Status;
import com.nkia.Orbis.domain.user.entity.User;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;


@Getter
@Builder
public class UserResponse {
    private UUID id;

    private String employeeNumber;

    private Position position;

    private String name;

    private String phone;

    private String email;

    private Status status;

    private Long departmentId;

    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .employeeNumber(user.getEmployeeNumber())
                .position(user.getPosition())
                .name(user.getName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .status(user.getStatus())
                .departmentId(user.getDepartment().getId())
                .createdAt(user.getCreatedAt())
                .build();
    }
}