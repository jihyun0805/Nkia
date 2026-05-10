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
public class GeneralOverheadExpenseItemDto {
  private String majorCategory;         // 대분류
  private String minorCategory;         // 소분류
  private String detailsAndBasis;       // 내역 및 산출 근거
  private BigDecimal unitPrice;         // 단가
  private BigDecimal amount;            // 금액
}
