package com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.SupportDataType;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class IntegratedSupportListResponse {
    private SupportDataType dataType; // 요청 or 활동

    private Long id;

    private String customerName;

    private String activityCategory; // 코드 or 정기점검

    private LocalDateTime startAt;

    private LocalDateTime endAt;

    private String ownerName; // 요청/등록자

    private String salesRepName;

    private String supportManagerName;
}
