package com.nkia.Orbis.domain.admin.user.dto.response;

import com.nkia.Orbis.domain.admin.user.entity.User;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserSearchResponse {

    private UUID id;

    private String position;

    private String name;

    private String departmentName;

    public static UserSearchResponse from(User user) {
        return UserSearchResponse.builder()
                .id(user.getId())
                .position(user.getPosition().getDescription())
                .name(user.getName())
                .departmentName(user.getDepartment().getTeam())
                .build();
    }
}
