package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.BidType;
import com.nkia.Orbis.domain.bid.prb.entity.PrbProjectInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbProjectInfoDto {
  private LocalDate projectStartDate;
  private LocalDate projectEndDate;
  private BidType bidType;
  private LocalDate preSpecNoticeDate;
  private LocalDate officialNoticeDate;
  private LocalDateTime priceBiddingDatetime;
  private LocalDateTime proposalDeadlineDatetime;
  private LocalDateTime proposalPresentationDatetime;
  private BigDecimal technicalEvalRatio;
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
    if (entity == null)
      return null;
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
