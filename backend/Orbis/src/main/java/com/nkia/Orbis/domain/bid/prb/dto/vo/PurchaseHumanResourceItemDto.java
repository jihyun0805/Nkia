package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.EngineerGrade;
import com.nkia.Orbis.domain.bid.prb.entity.PurchaseHumanResource;
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
public class PurchaseHumanResourceItemDto {
  private EngineerGrade grade;          // 등급
  private BigDecimal inputManMonth;     // 투입량 (M/M)
  private LocalDate startDate;          // 투입 시작일자
  private LocalDate endDate;            // 투입 종료일자
  private BigDecimal baseAmount;        // 기준 금액
  private BigDecimal totalAmount;       // 금액 (Request 시 null 허용, Response 시 계산값 포함)

  public PurchaseHumanResource toEntity() {
    return new PurchaseHumanResource(grade, inputManMonth, startDate, endDate, baseAmount);
  }

  public static PurchaseHumanResourceItemDto from(PurchaseHumanResource entity) {
    if (entity == null)
      return null;
    return PurchaseHumanResourceItemDto.builder()
        .grade(entity.getGrade())
        .inputManMonth(entity.getInputManMonth())
        .startDate(entity.getStartDate())
        .endDate(entity.getEndDate())
        .baseAmount(entity.getBaseAmount())
        .totalAmount(entity.getTotalAmount())
        .build();
  }
}
