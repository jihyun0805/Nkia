package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.BidType;
import com.nkia.Orbis.domain.bid.prb.entity.PrbProjectInfo;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbProjectInfoDto {
    // 사업 기간 시작일
    private LocalDate projectStartDate;
    // 사업 기간 종료일
    private LocalDate projectEndDate;
    // 입찰 구분
    private BidType bidType;
    // 사전 규격 공고일
    private LocalDate preSpecNoticeDate;
    // 정식 공고 공고일
    private LocalDate officialNoticeDate;
    // 가격 투찰일
    private LocalDateTime priceBiddingDatetime;
    // 제안서 마감일
    private LocalDateTime proposalDeadlineDatetime;
    // 제안 발표일
    private LocalDateTime proposalPresentationDatetime;
    // 기술 평가 비율
    private BigDecimal technicalEvalRatio;
    // 가격 평가 비율
    private BigDecimal priceEvalRatio;

    // Request -> Entity
    public PrbProjectInfo toEntity() {
        return PrbProjectInfo.builder()
                .projectStartDate(projectStartDate)
                .projectEndDate(projectEndDate)
                .bidType(bidType)
                .preSpecNoticeDate(preSpecNoticeDate)
                .officialNoticeDate(officialNoticeDate)
                .priceBiddingDatetime(priceBiddingDatetime)
                .proposalDeadlineDatetime(proposalDeadlineDatetime)
                .proposalPresentationDatetime(proposalPresentationDatetime)
                .technicalEvalRatio(technicalEvalRatio)
                .priceEvalRatio(priceEvalRatio)
                .build();
    }

    // Entity -> Response
    public static PrbProjectInfoDto from(PrbProjectInfo entity) {
        if (entity == null) {
            return null;
        }
        return PrbProjectInfoDto.builder()
                .projectStartDate(entity.getProjectStartDate())
                .projectEndDate(entity.getProjectEndDate())
                .bidType(entity.getBidType())
                .preSpecNoticeDate(entity.getPreSpecNoticeDate())
                .officialNoticeDate(entity.getOfficialNoticeDate())
                .priceBiddingDatetime(entity.getPriceBiddingDatetime())
                .proposalDeadlineDatetime(entity.getProposalDeadlineDatetime())
                .proposalPresentationDatetime(entity.getProposalPresentationDatetime())
                .technicalEvalRatio(entity.getTechnicalEvalRatio())
                .priceEvalRatio(entity.getPriceEvalRatio())
                .build();
    }
}
