package com.nkia.Orbis.domain.salesactivity.salesactivityrequest.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.salesactivity.salesactivity.entity.SalesActivity;
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

    private LocalDateTime activityDateTime;

    private String requestContent;

    public static SalesActivityRequest create(
            SalesActivity salesActivity,
            User targetUser,
            ActivityPurpose activityPurpose,
            LocalDateTime activityDateTime,
            String requestContent
    ) {
        SalesActivityRequest request = new SalesActivityRequest();
        request.salesActivity = salesActivity;
        request.targetUser = targetUser;
        request.activityPurpose = activityPurpose;
        request.activityDateTime = activityDateTime;
        request.requestContent = requestContent;
        return request;
    }

    public void setSalesActivity(SalesActivity salesActivity) {
        this.salesActivity = salesActivity;
    }
}