package com.nkia.Orbis.domain.bid.prb.dto.vo;

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
public class PersonnelExpensesDto {
  private List<PersonnelExpenseItemDto> residentExpenses;
  private List<PersonnelExpenseItemDto> nonResidentExpenses;

  private BigDecimal residentTotalManMonth;
  private BigDecimal residentTotalAmount;
  private BigDecimal nonResidentTotalManMonth;
  private BigDecimal nonResidentTotalAmount;

  private BigDecimal totalManMonth;
  private BigDecimal totalAmount;
}
