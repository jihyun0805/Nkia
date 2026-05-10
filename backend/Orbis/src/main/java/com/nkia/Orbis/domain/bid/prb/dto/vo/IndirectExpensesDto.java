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
public class IndirectExpensesDto {
  private BigDecimal baseAmount;   // 간접비 적용 대상 금액 (인건비+제품+매입+제경비)
  private BigDecimal rate;         // 간접비율 (%)
  private BigDecimal amount;       // 최종 간접비 금액
}
