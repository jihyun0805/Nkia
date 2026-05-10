package com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request.CustomerSupportCreateRequest.ParticipantDto;
import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.ActivityType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CustomerSupportUpdateRequest {

    private Long customerCompanyCode;

    private ActivityType activityType;

    private LocalDateTime activityStartTime;

    private LocalDateTime activityEndTime;

    private String activityContent;

    private UUID registrantId;

    private String remarks;

    private List<ParticipantDto> participantList = new ArrayList<>();

    private List<Long> attachedFileIds = new ArrayList<>();
}
