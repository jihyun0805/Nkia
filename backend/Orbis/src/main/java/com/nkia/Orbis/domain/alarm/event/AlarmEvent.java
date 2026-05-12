package com.nkia.Orbis.domain.alarm.event;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.alarm.entity.AlarmType;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AlarmEvent {
    private User sender;
    private User receiver;
    private AlarmType type;
    private String message;
    private Long targetId;
}