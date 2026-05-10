package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.EngineerGrade;
import com.nkia.Orbis.domain.bid.prb.entity.PersonnelExpense;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonnelExpenseItemDto {
  private EngineerGrade grade;          // 등급
  private BigDecimal inputManMonth;     // 투입량 (M/M)
  private LocalDate startDate;          // 투입 시작 기간
  private LocalDate endDate;            // 투입 종료 기간
  private BigDecimal baseAmount;        // 기준 금액
  private BigDecimal totalAmount;       // 금액 (Request 시 null 허용, Response 시 포함)

  // Request -> Entity 변환
  public PersonnelExpense toEntity() {
    // 생성자를 호출하면 내부에서 totalAmount가 자동 계산됩니다.
    return new PersonnelExpense(grade, inputManMonth, startDate, endDate, baseAmount);
  }

  // Entity -> Response 변환
  public static PersonnelExpenseItemDto from(PersonnelExpense entity) {
    if (entity == null)
      return null;
    return PersonnelExpenseItemDto.builder()
        .grade(entity.getGrade())
        .inputManMonth(entity.getInputManMonth())
        .startDate(entity.getStartDate())
        .endDate(entity.getEndDate())
        .baseAmount(entity.getBaseAmount())
        .totalAmount(entity.getTotalAmount()) // 엔티티에서 계산된 최종 금액 포함
        .build();
  }
}
