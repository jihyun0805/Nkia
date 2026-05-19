package com.nkia.Orbis.domain.bid.bidresult.dto.request;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.CompanyScoreDto;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.WinLossAnalysisDto;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidOutcome;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidResult;
import com.nkia.Orbis.domain.bid.bidresult.entity.DisclosureStatus;
import com.nkia.Orbis.domain.bid.proposal.entity.Proposal;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BidResultCreateRequest {

    @NotNull(message = "사업 기회 ID는 필수입니다.")
    private Long projectOpportunityId;

    private Long proposalId;

    @NotNull(message = "영업대표 ID는 필수입니다.")
    private UUID salesRepresentativeId;

    // PM id
    private UUID projectManagerId;

    // 예산
    @PositiveOrZero(message = "예산은 0원 이상이어야 합니다.")
    private BigDecimal budget;

    // 입찰 공고일
    private LocalDate bidAnnouncementDate;

    // 외부 PD 작업 여부
    @NotNull(message = "외부 PD 작업 여부는 필수입니다.")
    private Boolean isExternalPdInvolved;

    // 핵심 성공 요소
    private String keySuccessFactors;
    // RFP 이슈 사항
    private String rfpIssues;
    // 제안 전략
    private String proposalStrategy;

    // 수주/실주 여부
    @NotNull(message = "수주/실주 여부는 필수입니다.")
    private BidOutcome bidOutcome;

    // 평가 결과
    @NotNull(message = "공개 여부는 필수입니다.")
    private DisclosureStatus disclosureStatus;

    // 당사 점수
    @Valid
    @NotNull(message = "자사 점수는 필수입니다.")
    private CompanyScoreDto ourCompanyScore;

    // 경쟁사 점수
    @Builder.Default
    @Valid
    private List<CompanyScoreDto> competitorScores = new ArrayList<>();

    // 수주/실주 원인 분석
    @Builder.Default
    @Valid
    private List<WinLossAnalysisDto> analyses = new ArrayList<>();

    public BidResult toEntity(ProjectOpportunity projectOpportunity, Proposal proposal,
                              User salesRepresentative, User projectManager) {

        // 1. 기본 필드와 단일 VO를 빌더로 조립하여 엔티티 생성
        BidResult bidResult = getBidResult(projectOpportunity, proposal, salesRepresentative, projectManager);

        // 2. 리스트 형태의 데이터는 엔티티의 비즈니스 메서드(add...)를 호출하여 추가
        getCompetitorsScores(bidResult);
        getAnalyses(bidResult);

        return bidResult;
    }

    private BidResult getBidResult(ProjectOpportunity projectOpportunity, Proposal proposal, User salesRepresentative,
                                   User projectManager) {
        return BidResult.builder()
                .projectOpportunity(projectOpportunity)
                .proposal(proposal)
                .salesRepresentative(salesRepresentative)
                .projectManager(projectManager)
                .budget(this.budget)
                .isExternalPdInvolved(this.isExternalPdInvolved)
                .keySuccessFactors(this.keySuccessFactors)
                .rfpIssues(this.rfpIssues)
                .proposalStrategy(this.proposalStrategy)
                .bidOutcome(this.bidOutcome)
                .disclosureStatus(this.disclosureStatus)
                .bidAnnouncementDate(this.bidAnnouncementDate)
                .ourCompanyScore(this.ourCompanyScore.toValueObject()) // 자사 점수 VO 변환
                .build();
    }

    private void getCompetitorsScores(BidResult bidResult) {
        // 이렇게 해야 엔티티 내부의 '총점 계산'이나 '중복 검증' 로직이 정상 작동합니다.
        if (this.competitorScores != null) {
            this.competitorScores.forEach(dto ->
                    bidResult.addCompetitorScore(dto.getCompanyName(), dto.getTechnicalScore(), dto.getPriceScore())
            );
        }
    }

    private void getAnalyses(BidResult bidResult) {
        if (this.analyses != null) {
            this.analyses.forEach(dto ->
                    bidResult.addAnalysis(dto.toValueObject())
            );
        }
    }
}