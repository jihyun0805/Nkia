package com.nkia.Orbis.domain.salesactivity.salesactivity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.salesactivity.salesactivityrequest.entity.SalesActivityRequest;
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
    private ActivityStatus status = ActivityStatus.PLANNED;

    @OneToOne(mappedBy = "salesActivity", cascade = CascadeType.ALL, orphanRemoval = true)
    private SalesActivityRequest salesActivityRequest;
}
