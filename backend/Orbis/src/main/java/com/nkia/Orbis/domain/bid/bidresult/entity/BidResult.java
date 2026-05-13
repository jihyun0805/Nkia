package com.nkia.Orbis.domain.bid.bidresult.entity;

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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@Table(name = "bid_result", indexes = {
        @Index(name = "idx_bid_result_outcome", columnList = "bid_outcome") // 성능 최적화: 대시보드 통계용 인덱스
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false") // Soft Delete 적용
public class BidResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id", unique = true, nullable = false)
    private ProjectOpportunity projectOpportunity;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id", unique = true)
    private Proposal proposal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_manager_id")
    private User projectManager;

    // --- 비즈니스 데이터 필드 ---

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "bid_outcome")
    private BidOutcome bidOutcome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DisclosureStatus disclosureStatus;

    // 입찰 공고일
    @Column(name = "bid_announcement_date")
    private LocalDate bidAnnouncementDate;

    // 제안 발표일
    @Column(name = "presentation_date")
    private LocalDate presentationDate;

    @Embedded
    private CompanyScore ourCompanyScore;

    @ElementCollection
    @CollectionTable(name = "bid_result_competitor_score", joinColumns = @JoinColumn(name = "bid_result_id"))
    private List<CompanyScore> competitorScores = new ArrayList<>();

    // [신규] 수주/실주 원인 분석 VO 컬렉션
    @ElementCollection
    @CollectionTable(name = "bid_result_analysis", joinColumns = @JoinColumn(name = "bid_result_id"))
    private List<WinLossAnalysis> analyses = new ArrayList<>();

    // [신규] 원인 분석 총합 점수
    @Column(name = "total_analysis_score", nullable = false)
    private Integer totalAnalysisScore = 0;

    @Builder
    public BidResult(ProjectOpportunity projectOpportunity, Proposal proposal, User salesRepresentative,
                     User projectManager, BigDecimal budget, Boolean isExternalPdInvolved,
                     String keySuccessFactors, String rfpIssues, String proposalStrategy,
                     BidOutcome bidOutcome, DisclosureStatus disclosureStatus,
                     CompanyScore ourCompanyScore,
                     LocalDate bidAnnouncementDate, LocalDate presentationDate) { // 파라미터 추가
        this.projectOpportunity = projectOpportunity;
        this.proposal = proposal;
        this.salesRepresentative = salesRepresentative;
        this.projectManager = projectManager;
        this.budget = budget;
        this.isExternalPdInvolved = isExternalPdInvolved != null ? isExternalPdInvolved : false;
        this.keySuccessFactors = keySuccessFactors;
        this.rfpIssues = rfpIssues;
        this.proposalStrategy = proposalStrategy;
        this.bidOutcome = bidOutcome;
        this.disclosureStatus = disclosureStatus;
        this.ourCompanyScore = ourCompanyScore;
        this.bidAnnouncementDate = bidAnnouncementDate; // 할당 추가
        this.presentationDate = presentationDate;       // 할당 추가
        this.totalAnalysisScore = 0;
    }

    // --- 비즈니스 로직 (도메인 주도 설계) ---

    /**
     * [신규] 경쟁사 점수 추가
     */
    public void addCompetitorScore(String companyName, double techScore, double priceScore) {
        // 엔티티 내부에서 객체 생성을 캡슐화
        this.competitorScores.add(CompanyScore.of(companyName, techScore, priceScore));
    }

    /**
     * [개선] 수주/실주 원인 분석 추가 (정합성 보장)
     */
    public void addAnalysis(WinLossAnalysis analysis) {
        // 1. 값 검증
        if (analysis.getScore() < 1 || analysis.getScore() > 5) {
            throw new IllegalArgumentException("분석 점수는 1점에서 5점 사이여야 합니다.");
        }

        // 2. [변경] 카테고리 단일 중복 검증 -> '카테고리 + 동일한 체크리스트 질문' 중복 검증으로 변경
        boolean isDuplicate = this.analyses.stream().anyMatch(
                a -> a.getCategory() == analysis.getCategory() && a.getEvaluationItem()
                        .equals(analysis.getEvaluationItem()));

        if (isDuplicate) {
            throw new IllegalStateException("해당 카테고리에 이미 동일한 평가 항목(" + analysis.getEvaluationItem() + ")이 존재합니다.");
        }

        // 3. 리스트에 추가
        this.analyses.add(analysis);

        // 4. 총점 재계산 (이전 리팩토링 덕분에 코드 수정 없이 그대로 사용 가능!)
        recalculateTotalAnalysisScore();
    }

    /**
     * 총점을 동적으로 다시 계산하는 Private 메서드
     */
    private void recalculateTotalAnalysisScore() {
        this.totalAnalysisScore = this.analyses.stream()
                .mapToInt(WinLossAnalysis::getScore)
                .sum();
    }

    /**
     * 특정 수주/실주 원인 분석 항목을 삭제합니다. (VO는 불변이므로, 수정이 필요할 경우 삭제 후 재추가 방식을 사용합니다)
     */
    public void removeAnalysis(AnalysisCategory category, String evaluationItem) {
        // 조건에 맞는 항목 찾아 삭제
        boolean isRemoved = this.analyses.removeIf(a ->
                a.getCategory() == category && a.getEvaluationItem().equals(evaluationItem)
        );

        // 삭제가 성공적으로 이루어졌다면 총점을 다시 계산하여 정합성 유지
        if (isRemoved) {
            recalculateTotalAnalysisScore();
        }
    }
}