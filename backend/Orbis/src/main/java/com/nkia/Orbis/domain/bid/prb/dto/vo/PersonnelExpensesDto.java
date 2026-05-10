package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.PersonnelExpenses;
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

  public static PersonnelExpensesDto from(PersonnelExpenses entity) {
    if (entity == null)
      return null;
    return PersonnelExpensesDto.builder()
        // 내부 리스트 변환 (ItemDto의 from 메서드 재사용)
        .residentExpenses(
            entity.getResidentExpenses().stream().map(PersonnelExpenseItemDto::from).toList())
        .nonResidentExpenses(
            entity.getNonResidentExpenses().stream().map(PersonnelExpenseItemDto::from).toList())
        // 합계 정보 매핑
        .residentTotalManMonth(entity.getResidentTotalManMonth())
        .residentTotalAmount(entity.getResidentTotalAmount())
        .nonResidentTotalManMonth(entity.getNonResidentTotalManMonth())
        .nonResidentTotalAmount(entity.getNonResidentTotalAmount())
        .totalManMonth(entity.getTotalManMonth())
        .totalAmount(entity.getTotalAmount())
        .build();
  }
}
