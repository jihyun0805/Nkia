package com.nkia.Orbis.domain.activity.salesactivityrequest.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityType;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SalesActivityRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_activity_id", unique = true)
    private SalesActivity salesActivity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityPurpose activityPurpose;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    private LocalDateTime activityDateTime;

    private String requestContent;

    public static SalesActivityRequest create(
            User targetUser,
            ActivityPurpose activityPurpose,
            ActivityType activityType,
            LocalDateTime activityDateTime,
            String requestContent
    ) {
        SalesActivityRequest salesActivityRequest = new SalesActivityRequest();
        salesActivityRequest.targetUser = targetUser;
        salesActivityRequest.activityPurpose = activityPurpose;
        salesActivityRequest.activityType = activityType;
        salesActivityRequest.activityDateTime = activityDateTime;
        salesActivityRequest.requestContent = requestContent;
        return salesActivityRequest;
    }

    public void setSalesActivity(SalesActivity salesActivity) {
        this.salesActivity = salesActivity;
        salesActivity.setSalesActivityRequest(this);
    }
}