package com.nkia.Orbis.domain.maintenance.customersupport.activity.dto.response;

import com.nkia.Orbis.domain.maintenance.customersupport.activity.entity.CustomerSupport;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportDetailResponse {
    private Long id;
    private Long requestId;
    private String customerName;
    private String activityType;
    private LocalDateTime activityStartTime;
    private LocalDateTime activityEndTime;
    private String activityContent;
    private String registrantName;
    private String remarks;
    private List<ParticipantResponse> participants;
    private List<Long> attachedFileIds;

    @Getter
    @Builder
    public static class ParticipantResponse {
        private String userName;
        private String roleDescription;
    }

    /**
     * 엔티티를 상세 응답 DTO로 변환합니다.
     */
    public static CustomerSupportDetailResponse from(CustomerSupport support) {
        return CustomerSupportDetailResponse.builder()
                .id(support.getId())
                .requestId(support.getRequest() != null ? support.getRequest().getId() : null)
                .customerName(support.getCustomerCompany().getName())
                .activityType(support.getActivityType().name())
                .activityStartTime(support.getActivityStartTime())
                .activityEndTime(support.getActivityEndTime())
                .activityContent(support.getActivityContent())
                .registrantName(support.getRegistrant().getName())
                .remarks(support.getRemarks())
                .participants(support.getOtherDepartmentUsers().stream()
                        .map(p -> ParticipantResponse.builder()
                                .userName(p.getUser().getName())
                                .roleDescription(p.getRoleDescription()).build()).toList())
                .attachedFileIds(support.getAttachedFiles().stream().map(f -> f.getId()).toList())
                .build();
    }
}
