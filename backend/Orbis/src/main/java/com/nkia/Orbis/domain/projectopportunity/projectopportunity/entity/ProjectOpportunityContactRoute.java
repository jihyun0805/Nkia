package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import com.nkia.Orbis.domain.company.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectOpportunityContactRoute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company; // 접촉한 회사

    @Column(nullable = false)
    private Integer sequence; // 접촉 순서 (1, 2, 3...)

    @Builder
    public ProjectOpportunityContactRoute(ProjectOpportunity projectOpportunity, Company company, Integer sequence) {
        this.projectOpportunity = projectOpportunity;
        this.company = company;
        this.sequence = sequence;
    }
}
