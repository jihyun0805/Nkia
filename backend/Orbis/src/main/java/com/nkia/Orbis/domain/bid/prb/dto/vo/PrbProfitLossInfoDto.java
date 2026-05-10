package com.nkia.Orbis.domain.bid.prb.dto.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbProfitLossInfoDto {
  private BigDecimal totalProjectAmount;
  private BigDecimal ourCompanyAmount;
  private BigDecimal expectedWinRate;
  private BigDecimal estimatedRevenue;        // 계산된 추정 매출액
  private BigDecimal estimatedOperatingProfit;
  private BigDecimal estimatedProfitMargin;   // 계산된 추정 이익율
}
