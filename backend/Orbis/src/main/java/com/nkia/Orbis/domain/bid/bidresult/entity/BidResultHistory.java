package com.nkia.Orbis.domain.bid.bidresult.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@Builder
@Table(name = "bid_result_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class BidResultHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bid_result_history_id")
    private Long id;

    // 원본 BidResult ID
    @Column(name = "original_bid_result_id", nullable = false)
    private Long bidResultId;

    @Column(nullable = false)
    private Integer version;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

    @Enumerated(EnumType.STRING)
    private BidOutcome bidOutcome;

    @Enumerated(EnumType.STRING)
    private DisclosureStatus disclosureStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id")
    private Proposal proposal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_manager_id")
    private User projectManager;

    @Column(precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(nullable = false)
    private Boolean isExternalPdInvolved = false;

    @Lob
    private String keySuccessFactors;

    @Lob
    private String rfpIssues;

    @Lob
    private String proposalStrategy;

    @Column(name = "bid_announcement_date")
    private LocalDate bidAnnouncementDate;

    // 자사 점수
    @Embedded
    private CompanyScore ourCompanyScore;

    @Column(name = "total_analysis_score")
    private Integer totalAnalysisScore;

    // 경쟁사 점수 리스트 (테이블명 분리)
    @ElementCollection
    @CollectionTable(
            name = "bid_result_history_competitor_score",
            joinColumns = @JoinColumn(name = "bid_result_history_id")
    )
    @Builder.Default
    private List<CompanyScore> competitorScores = new ArrayList<>();

    // 수주/실패 분석 리스트 (테이블명 분리)
    @ElementCollection
    @CollectionTable(
            name = "bid_result_history_analysis",
            joinColumns = @JoinColumn(name = "bid_result_history_id")
    )
    @Builder.Default
    private List<WinLossAnalysis> analyses = new ArrayList<>();

    /**
     * 스냅샷 팩토리 메서드 (완벽한 깊은 복사 적용)
     */
    public static BidResultHistory createSnapshot(BidResult bidResult, Integer version) {
        return BidResultHistory.builder()
                .bidResultId(bidResult.getId())
                .version(version)
                .status(bidResult.getStatus())
                .bidOutcome(bidResult.getBidOutcome())
                .disclosureStatus(bidResult.getDisclosureStatus())
                .projectOpportunity(bidResult.getProjectOpportunity())
                .proposal(bidResult.getProposal())
                .salesRepresentative(bidResult.getSalesRepresentative())
                .projectManager(bidResult.getProjectManager())
                .budget(bidResult.getBudget())
                .isExternalPdInvolved(bidResult.getIsExternalPdInvolved())
                .keySuccessFactors(bidResult.getKeySuccessFactors())
                .rfpIssues(bidResult.getRfpIssues())
                .proposalStrategy(bidResult.getProposalStrategy())
                .bidAnnouncementDate(bidResult.getBidAnnouncementDate())
                .totalAnalysisScore(bidResult.getTotalAnalysisScore())
                // 자사 점수 복사
                .ourCompanyScore(bidResult.getOurCompanyScore() != null ? bidResult.getOurCompanyScore().copy() : null)
                // 경쟁사 점수 리스트 복사
                .competitorScores(bidResult.getCompetitorScores() != null ?
                        bidResult.getCompetitorScores().stream().map(CompanyScore::copy).toList() : new ArrayList<>())
                // 분석 리스트 복사
                .analyses(bidResult.getAnalyses() != null ?
                        bidResult.getAnalyses().stream().map(WinLossAnalysis::copy).toList() : new ArrayList<>())
                .build();
    }
}