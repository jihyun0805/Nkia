package com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@Table(name = "rfp_analyze_result",
        indexes = {@Index(name = "idx_rfp_proposal_deadline", columnList = "proposal_deadline")})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class RfpAnalyzeResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_name", nullable = false)
    private String projectName;

    @Column(name = "hardware_provider", length = 100)
    private String hardwareProvider;

    @Column(name = "budget_amount", precision = 15, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "expected_duration", length = 100)
    private String expectedDuration;

    @Column(name = "project_location", length = 255)
    private String projectLocation;

    @Column(name = "proposal_deadline")
    private LocalDateTime proposalDeadline;

    @Column(name = "project_description", columnDefinition = "TEXT")
    private String projectDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private RfpStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "proposal_type", length = 20)
    private ProposalType proposalType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id", unique = true)
    private ProjectOpportunity projectOpportunity;

    // 양방향 연관관계 추가 (일대다)
    @OneToMany(mappedBy = "rfpAnalyzeResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RfpRequirement> requirements = new ArrayList<>();

    @Builder
    public RfpAnalyzeResult(String projectName, String hardwareProvider, BigDecimal budgetAmount,
                            String expectedDuration, String projectLocation, LocalDateTime proposalDeadline,
                            String projectDescription, RfpStatus status, ProposalType proposalType, User assignee,
                            ProjectOpportunity projectOpportunity) {
        this.projectName = projectName;
        this.hardwareProvider = hardwareProvider;
        this.budgetAmount = budgetAmount;
        this.expectedDuration = expectedDuration;
        this.projectLocation = projectLocation;
        this.proposalDeadline = proposalDeadline;
        this.projectDescription = projectDescription;
        // 생성 시 상태값이 없으면 '접수'를 기본값으로 설정
        this.status = (status != null) ? status : RfpStatus.RECEIVED;
        this.proposalType = proposalType;
        this.assignee = assignee;
        this.projectOpportunity = projectOpportunity;
    }

    // 연관관계 편의 메서드
    public void addRequirement(RfpRequirement requirement) {
        this.requirements.add(requirement);
        requirement.assignRfpAnalyzeResult(this);
    }

    // 상태 변경 메서드 (비즈니스 로직)
    public void updateStatus(RfpStatus status) {
        this.status = status;
    }

    // 기존 데이터 수정 메서드 (더티 체킹용)
    public void update(String projectName, String hardwareProvider, BigDecimal budgetAmount,
                       String expectedDuration, String projectLocation, LocalDateTime proposalDeadline,
                       String projectDescription, ProposalType proposalType, User assignee) {
        this.projectName = projectName;
        this.hardwareProvider = hardwareProvider;
        this.budgetAmount = budgetAmount;
        this.expectedDuration = expectedDuration;
        this.projectLocation = projectLocation;
        this.proposalDeadline = proposalDeadline;
        this.projectDescription = projectDescription;
        this.proposalType = proposalType;
        this.assignee = assignee;
    }

    public void assignProjectOpportunity(ProjectOpportunity projectOpportunity) {
        this.projectOpportunity = projectOpportunity;
    }
}
