package com.nkia.Orbis.domain.bid.bidresult.dto.request;

import com.nkia.Orbis.domain.bid.bidresult.dto.vo.CompanyScoreDto;
import com.nkia.Orbis.domain.bid.bidresult.dto.vo.WinLossAnalysisDto;
import com.nkia.Orbis.domain.bid.bidresult.entity.BidOutcome;
import com.nkia.Orbis.domain.bid.bidresult.entity.DisclosureStatus;
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
public class BidResultUpdateRequest {

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

    // 평가 결과 공개/비공개 여부
    @NotNull(message = "공개 여부는 필수입니다.")
    private DisclosureStatus disclosureStatus;

    @Valid
    @NotNull(message = "자사 점수는 필수입니다.")
    private CompanyScoreDto ourCompanyScore;

    @Builder.Default
    @Valid
    private List<CompanyScoreDto> competitorScores = new ArrayList<>();

    @Builder.Default
    @Valid
    private List<WinLossAnalysisDto> analyses = new ArrayList<>();
}