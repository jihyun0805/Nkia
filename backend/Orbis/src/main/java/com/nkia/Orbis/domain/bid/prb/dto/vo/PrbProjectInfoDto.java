package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.BidType;
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
}
