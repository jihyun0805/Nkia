package com.nkia.Orbis.domain.bid.bidresult.dto.response;

import com.nkia.Orbis.domain.bid.bidresult.dto.vo.CompanyScoreDto;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.ProductModuleSummaryDto;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.WinLossAnalysisDto;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidOutcome;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResultHistory;
import com.nkia.Orbis.domain.bid.bidresult.entity.DisclosureStatus;
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
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class BidResultHistoryResponse {

    // --- 변경 이력 식별용 메타 데이터 (추가) ---
    private Long historyId;
    private Long bidResultId;
    private Integer version;

    // 예산
    private BigDecimal budget;
    // 외부 PD 작업 여부
    private Boolean isExternalPdInvolved;
    // 핵심 성공 요소
    private String keySuccessFactors;
    // RFP 이슈 사항
    private String rfpIssues;
    // 제안 전략
    private String proposalStrategy;

    // 수주/실주 여부
    private BidOutcome bidOutcome;
    // 평가 결과 공개/비공개 여부
    private DisclosureStatus disclosureStatus;

    // 입찰 공고일
    private LocalDate bidAnnouncementDate;

    // 합계 점수
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
    // 제안서 등록 (코드)
    private Long proposalId;
    // 제안 작성 참여자명
    private String proposalCreatorName;

    // --- 6. RFP Analyze Result 관련 필드 ---
    // 제안서 접수 마감일
    private LocalDateTime proposalDeadline;

    // --- 7. PRB 관련 필드 ---
    // 제안 발표일
    private LocalDateTime presentationDate;

    // --- 8. Product Module 관련 필드 ---
    private List<ProductModuleSummaryDto> productModules;

    // --- 9. VO 필드 ---
    private CompanyScoreDto ourCompanyScore;
    private List<CompanyScoreDto> competitorScores;
    private List<WinLossAnalysisDto> analyses;

    /**
     * 엔티티와 서비스 계층에서 파싱한 작성자명을 받아 DTO로 변환하는 정적 팩토리 메서드
     */
    public static BidResultHistoryResponse of(BidResultHistory history, String proposalCreatorName) {
        if (history == null) {
            return null;
        }

        ProjectOpportunity po = history.getProjectOpportunity();

        return BidResultHistoryResponse.builder()
                .historyId(history.getId())
                .bidResultId(history.getBidResultId())
                .version(history.getVersion())
                .budget(history.getBudget())
                .isExternalPdInvolved(history.getIsExternalPdInvolved())
                .keySuccessFactors(history.getKeySuccessFactors())
                .rfpIssues(history.getRfpIssues())
                .proposalStrategy(history.getProposalStrategy())
                .bidOutcome(history.getBidOutcome())
                .disclosureStatus(history.getDisclosureStatus())
                .bidAnnouncementDate(history.getBidAnnouncementDate())
                .totalAnalysisScore(history.getTotalAnalysisScore())
                // 연관 엔티티 뼈대 데이터 매핑 (Null-Safe)
                .salesRepresentativeName(
                        history.getSalesRepresentative() != null ? history.getSalesRepresentative().getName()
                                : null)
                .projectManagerName(
                        history.getProjectManager() != null ? history.getProjectManager().getName() : null)
                .opportunityCode(po.getOpportunityCode())
                .opportunityName(po.getOpportunityName())
                .customerCompanyCode(po.getCustomerCompany() != null ? po.getCustomerCompany().getCode() : null)
                .customerCompanyName(po.getCustomerCompany() != null ? po.getCustomerCompany().getName() : null)
                .proposalId(history.getProposal() != null ? history.getProposal().getId() : null)
                .proposalCreatorName(proposalCreatorName)
                .proposalDeadline(
                        po.getRfpAnalyzeResult() != null ? po.getRfpAnalyzeResult().getProposalDeadline() : null)
                .presentationDate(
                        po.getPrb() != null ? po.getPrb().getProjectInfo().getProposalPresentationDatetime() : null)

                // 컬렉션 및 복합 객체 매핑 (Private Helper Method 호출)
                .productModules(extractProductModules(po))
                .ourCompanyScore(toCompanyScoreDto(history.getOurCompanyScore()))
                .competitorScores(extractCompetitorScores(history.getCompetitorScores()))
                .analyses(extractAnalyses(history.getAnalyses()))
                .build();
    }

    // --- 도메인 일관성을 위해 원본 Response DTO의 내부 헬퍼 메서드 구조를 그대로 계승 ---
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

    private static CompanyScoreDto toCompanyScoreDto(com.nkia.Orbis.domain.bid.bidresult.entity.CompanyScore score) {
        if (score == null) {
            return null;
        }
        return CompanyScoreDto.builder()
                .companyName(score.getCompanyName())
                .technicalScore(score.getTechnicalScore())
                .priceScore(score.getPriceScore())
                .build();
    }

    private static List<CompanyScoreDto> extractCompetitorScores(
            List<com.nkia.Orbis.domain.bid.bidresult.entity.CompanyScore> scores) {
        if (scores == null || scores.isEmpty()) {
            return Collections.emptyList();
        }
        return scores.stream()
                .map(BidResultHistoryResponse::toCompanyScoreDto)
                .collect(Collectors.toList());
    }

    private static List<WinLossAnalysisDto> extractAnalyses(
            List<com.nkia.Orbis.domain.bid.bidresult.entity.WinLossAnalysis> analyses) {
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