package com.nkia.Orbis.domain.bid.bidresult.dto.response;

import com.nkia.Orbis.domain.bid.bidresult.dto.vo.CompanyScoreDto;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.ProductModuleSummaryDto;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.WinLossAnalysisDto;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidOutcome;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.bidresult.entity.CompanyScore;
import com.nkia.Orbis.domain.bid.bidresult.entity.DisclosureStatus;
import com.nkia.Orbis.domain.bid.bidresult.entity.WinLossAnalysis;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BidResultDetailResponse {

    // --- 1. BidResult 기본 필드 ---
    private Long id;
    private BigDecimal budget;
    private Boolean isExternalPdInvolved;
    private String keySuccessFactors;
    private String rfpIssues;
    private String proposalStrategy;
    private BidOutcome bidOutcome;
    private DisclosureStatus disclosureStatus;
    private LocalDate bidAnnouncementDate;
    private LocalDate presentationDate;
    private Integer totalAnalysisScore;

    // --- 2. User 관련 필드 ---
    private String salesRepresentativeName;
    private String projectManagerName;

    // --- 3. Project Opportunity 관련 필드 ---
    private String opportunityCode;
    private String opportunityName;

    // --- 4. Customer Company 관련 필드 ---
    private String customerCompanyCode;
    private String customerCompanyName;

    // --- 5. Proposal 관련 필드 ---
    private Long proposalId;
    private String proposalCreatorName;

    // --- 6. RFP Analyze Result 관련 필드 ---
    private LocalDateTime proposalDeadline;

    // --- 7. Product Module 관련 필드 ---
    private List<ProductModuleSummaryDto> productModules;

    // --- 8. VO 필드 ---
    private CompanyScoreDto ourCompanyScore;
    private List<CompanyScoreDto> competitorScores;
    private List<WinLossAnalysisDto> analyses;

    /**
     * 메인 팩토리 메서드: 복잡한 로직은 헬퍼 메서드로 위임하여 전체적인 매핑 구조만 한눈에 파악할 수 있게 합니다.
     */
    public static BidResultDetailResponse of(BidResult bidResult, String proposalCreatorName) {
        ProjectOpportunity po = bidResult.getProjectOpportunity();

        return BidResultDetailResponse.builder()
                // 기본 필드
                .id(bidResult.getId())
                .budget(bidResult.getBudget())
                .isExternalPdInvolved(bidResult.getIsExternalPdInvolved())
                .keySuccessFactors(bidResult.getKeySuccessFactors())
                .rfpIssues(bidResult.getRfpIssues())
                .proposalStrategy(bidResult.getProposalStrategy())
                .bidOutcome(bidResult.getBidOutcome())
                .disclosureStatus(bidResult.getDisclosureStatus())
                .bidAnnouncementDate(bidResult.getBidAnnouncementDate())
                .presentationDate(bidResult.getPresentationDate())
                .totalAnalysisScore(bidResult.getTotalAnalysisScore())

                // 연관 엔티티 단일 필드 (Null-safe 처리)
                .salesRepresentativeName(
                        bidResult.getSalesRepresentative() != null ? bidResult.getSalesRepresentative().getName()
                                : null)
                .projectManagerName(
                        bidResult.getProjectManager() != null ? bidResult.getProjectManager().getName() : null)
                .opportunityCode(po.getOpportunityCode())
                .opportunityName(po.getOpportunityName())
                .customerCompanyCode(po.getCustomerCompany() != null ? po.getCustomerCompany().getCode() : null)
                .customerCompanyName(po.getCustomerCompany() != null ? po.getCustomerCompany().getName() : null)
                .proposalId(bidResult.getProposal() != null ? bidResult.getProposal().getId() : null)
                .proposalCreatorName(proposalCreatorName)
                .proposalDeadline(
                        po.getRfpAnalyzeResult() != null ? po.getRfpAnalyzeResult().getProposalDeadline() : null)

                // 컬렉션 및 복합 객체 매핑 (Private Helper Method 호출)
                .productModules(extractProductModules(po))
                .ourCompanyScore(toCompanyScoreDto(bidResult.getOurCompanyScore()))
                .competitorScores(extractCompetitorScores(bidResult.getCompetitorScores()))
                .analyses(extractAnalyses(bidResult.getAnalyses()))
                .build();
    }

    // ========================================================================
    // Private Helper Methods (메서드 분리)
    // ========================================================================

    private static List<ProductModuleSummaryDto> extractProductModules(ProjectOpportunity po) {
        if (po.getProductModules() == null || po.getProductModules().isEmpty()) {
            return Collections.emptyList(); // Null-safe 빈 리스트 반환
        }
        return po.getProductModules().stream()
                .map(mapping -> ProductModuleSummaryDto.builder()
                        .id(mapping.getProductModule().getId())
                        .productName(mapping.getProductModule().getProductName())
                        .build())
                .collect(Collectors.toList());
    }

    private static CompanyScoreDto toCompanyScoreDto(CompanyScore score) {
        if (score == null) {
            return null;
        }
        return CompanyScoreDto.builder()
                .companyName(score.getCompanyName())
                .technicalScore(score.getTechnicalScore())
                .priceScore(score.getPriceScore())
                .build();
    }

    private static List<CompanyScoreDto> extractCompetitorScores(List<CompanyScore> scores) {
        if (scores == null || scores.isEmpty()) {
            return Collections.emptyList();
        }
        return scores.stream()
                // 헬퍼 메서드 재사용 (Method Reference)
                .map(BidResultDetailResponse::toCompanyScoreDto)
                .collect(Collectors.toList());
    }

    private static List<WinLossAnalysisDto> extractAnalyses(List<WinLossAnalysis> analyses) {
        if (analyses == null || analyses.isEmpty()) {
            return Collections.emptyList();
        }
        return analyses.stream()
                .map(analysis -> WinLossAnalysisDto.builder()
                        .category(analysis.getCategory())
                        .evaluationItem(analysis.getEvaluationItem())
                        .score(analysis.getScore())
                        .reason(analysis.getReason())
                        .build())
                .collect(Collectors.toList());
    }
}