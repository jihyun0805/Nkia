package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.GeneralOverheadExpenses;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneralOverheadExpensesDto {
  private List<GeneralOverheadExpenseItemDto> items;
  private BigDecimal totalAmount;

  public static GeneralOverheadExpensesDto from(GeneralOverheadExpenses entity) {
    if (entity == null)
      return null;
    return GeneralOverheadExpensesDto.builder()
        .items(entity.getItems().stream().map(GeneralOverheadExpenseItemDto::from).toList())
        .totalAmount(entity.getTotalAmount())
        .build();
  }
}
