package com.nkia.Orbis.domain.activity.salesactivity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.activity.salesactivityrequest.entity.SalesActivityRequest;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SalesActivity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityPurpose activityPurpose;

    @Column(columnDefinition = "TEXT")
    private String activityContent;

    private String location;

    private LocalDateTime activityDateTime;

    @Column(columnDefinition = "TEXT")
    private String issue;

    @Column(columnDefinition = "TEXT")
    private String nextActivity;

    @OneToMany(mappedBy = "salesActivity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SalesActivityAttendee> attendees = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String customerInterest;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityStatus status;

    @OneToOne(mappedBy = "salesActivity", cascade = CascadeType.ALL, orphanRemoval = true)
    private SalesActivityRequest salesActivityRequest;

    public static SalesActivity create(
            ProjectOpportunity projectOpportunity,
            ActivityType activityType,
            ActivityPurpose activityPurpose,
            String activityContent,
            String location,
            LocalDateTime activityDateTime,
            String issue,
            String nextActivity,
            String customerInterest,
            ActivityStatus status
    ) {
        SalesActivity salesActivity = new SalesActivity();
        salesActivity.projectOpportunity = projectOpportunity;
        salesActivity.activityType = activityType;
        salesActivity.activityPurpose = activityPurpose;
        salesActivity.activityContent = activityContent;
        salesActivity.location = location;
        salesActivity.activityDateTime = activityDateTime;
        salesActivity.issue = issue;
        salesActivity.nextActivity = nextActivity;
        salesActivity.customerInterest = customerInterest;
        salesActivity.status = status;
        return salesActivity;
    }

    public void setSalesActivityRequest(SalesActivityRequest request) {
        this.salesActivityRequest = request;
        request.setSalesActivity(this);
    }

    public void addAttendee(SalesActivityAttendee attendee) {
        this.attendees.add(attendee);
        attendee.setSalesActivity(this);
    }

    public void update(
            ActivityType activityType,
            ActivityPurpose activityPurpose,
            String activityContent,
            String location,
            LocalDateTime activityDateTime,
            String issue,
            String nextActivity,
            String customerInterest,
            ActivityStatus status
    ) {
        if (activityType != null) {
            this.activityType = activityType;
        }
        if (activityPurpose != null) {
            this.activityPurpose = activityPurpose;
        }
        if (activityContent != null) {
            this.activityContent = activityContent;
        }
        if (location != null) {
            this.location = location;
        }
        if (activityDateTime != null) {
            this.activityDateTime = activityDateTime;
        }
        if (issue != null) {
            this.issue = issue;
        }
        if (nextActivity != null) {
            this.nextActivity = nextActivity;
        }
        if (customerInterest != null) {
            this.customerInterest = customerInterest;
        }
        if (status != null) {
            this.status = status;
        }
    }

    public void clearAttendees() {
        this.attendees.clear();
    }
}
