package com.nkia.Orbis.domain.maintenance.customersupport.activity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class CustomerSupportHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long id;

    @Column(nullable = false)
    private Long originalActivityId;

    private String customerName;
    private String activityType;
    
    private LocalDateTime activityStartTime;
    private LocalDateTime activityEndTime;

    @Column(columnDefinition = "TEXT")
    private String activityContent;

    private String registrantName;

    @Column(length = 1000)
    private String remarks;

    // 참여자 정보 (이름(역할) 형태를 콤마로 연결하여 보관)
    @Column(length = 1000)
    private String participantsInfo;

    @Builder
    public CustomerSupportHistory(Long originalActivityId, String customerName, String activityType,
                                  LocalDateTime activityStartTime, LocalDateTime activityEndTime,
                                  String activityContent, String registrantName, String remarks,
                                  String participantsInfo) {
        this.originalActivityId = originalActivityId;
        this.customerName = customerName;
        this.activityType = activityType;
        this.activityStartTime = activityStartTime;
        this.activityEndTime = activityEndTime;
        this.activityContent = activityContent;
        this.registrantName = registrantName;
        this.remarks = remarks;
        this.participantsInfo = participantsInfo;
    }

    public static CustomerSupportHistory createSnapshot(CustomerSupport support) {
        String participantsString = support.getOtherDepartmentUsers().stream()
                .map(p -> (p.getUser() != null ? p.getUser().getName() : "-") + "(" + p.getRoleDescription() + ")")
                .collect(Collectors.joining(", "));

        return CustomerSupportHistory.builder()
                .originalActivityId(support.getId())
                .customerName(support.getCustomerCompany() != null ? support.getCustomerCompany().getName() : "-")
                .activityType(support.getActivityType() != null ? support.getActivityType().getDescription() : "-")
                .activityStartTime(support.getActivityStartTime())
                .activityEndTime(support.getActivityEndTime())
                .activityContent(support.getActivityContent())
                .registrantName(support.getRegistrant() != null ? support.getRegistrant().getName() : "-")
                .remarks(support.getRemarks())
                .participantsInfo(participantsString.isEmpty() ? null : participantsString)
                .build();
    }
}
