package com.nkia.Orbis.domain.salesactivity.salesactivity.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
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

    @OneToMany(mappedBy = "salesActivity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SalesActivityAttendee> attendees = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "sales_activity_work", joinColumns = @JoinColumn(name = "sales_activity_id"))
    private List<Work> works = new ArrayList<>();

    @OneToOne(mappedBy = "salesActivity", cascade = CascadeType.ALL, orphanRemoval = true)
    private SalesActivityRequest salesActivityRequest;
}
