package com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity;

import com.nkia.Orbis.domain.company.entity.CompanyManager;
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
public class ProjectOpportunityDecisionMaker {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_manager_id")
    private CompanyManager decisionMaker;

    @Column(nullable = false)
    private Integer sequence; // 의사결정 순서 (예: 1번 팀장, 2번 본부장...)

    @Builder
    public ProjectOpportunityDecisionMaker(ProjectOpportunity projectOpportunity, CompanyManager decisionMaker,
                                           Integer sequence) {
        this.projectOpportunity = projectOpportunity;
        this.decisionMaker = decisionMaker;
        this.sequence = sequence;
    }
}
