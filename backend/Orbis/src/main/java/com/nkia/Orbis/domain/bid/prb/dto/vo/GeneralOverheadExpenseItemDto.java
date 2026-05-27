package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.GeneralOverheadExpense;
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

  public GeneralOverheadExpense toEntity() {
    return new GeneralOverheadExpense(majorCategory, minorCategory, detailsAndBasis, unitPrice,
        amount);
  }

  public static GeneralOverheadExpenseItemDto from(GeneralOverheadExpense entity) {
    if (entity == null)
      return null;
    return GeneralOverheadExpenseItemDto.builder()
        .majorCategory(entity.getMajorCategory())
        .minorCategory(entity.getMinorCategory())
        .detailsAndBasis(entity.getDetailsAndBasis())
        .unitPrice(entity.getUnitPrice())
        .amount(entity.getAmount())
        .build();
  }
}
