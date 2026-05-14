package com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.request;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.ActivityType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CustomerSupportCreateRequest {
    private Long requestId; // 정기점검일 경우 Null
    private Long maintenanceId; // 유효한 계약이 있을 경우 세팅

    private Long customerCompanyCode; // 고객사
    private ActivityType activityType;

    private LocalDateTime activityStartTime;
    private LocalDateTime activityEndTime;
    private String activityContent;

    private UUID registrantId;
    private String remarks;

    // 타부서 인원 리스트
    private List<ParticipantDto> participantList = new ArrayList<>();

    // 첨부파일 리스트
    private List<Long> attachedFileIds = new ArrayList<>();

    @Getter
    @NoArgsConstructor
    public static class ParticipantDto {
        private UUID userId;
        private String roleDescription;
    }
}
