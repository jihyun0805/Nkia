package com.nkia.Orbis.domain.activity.salesactivityrequest.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityPurpose;
import com.nkia.Orbis.domain.activity.salesactivity.entity.ActivityType;
import com.nkia.Orbis.domain.activity.salesactivity.entity.SalesActivity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.company.entity.Company;
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
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SalesActivityRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_activity_id", unique = true)
    private SalesActivity salesActivity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_user_id", nullable = false)
    private User requestUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityPurpose activityPurpose;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    private LocalDateTime activityDateTime;

    private String requestContent;

    public static SalesActivityRequest create(
            String title,
            Company company,
            User targetUser,
            User requestUser,
            ActivityPurpose activityPurpose,
            ActivityType activityType,
            LocalDateTime activityDateTime,
            String requestContent
    ) {
        SalesActivityRequest salesActivityRequest = new SalesActivityRequest();
        salesActivityRequest.title = title;
        salesActivityRequest.company = company;
        salesActivityRequest.targetUser = targetUser;
        salesActivityRequest.requestUser = requestUser;
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