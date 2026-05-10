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
public class PurchaseDto {
  private List<PurchaseHumanResourceItemDto> humanResources;
  private List<PurchaseProductItemDto> products;

  private BigDecimal serviceSubtotalManMonth;
  private BigDecimal serviceSubtotalAmount;
  private BigDecimal productSubtotalAmount;
  private BigDecimal totalPurchaseAmount;
}
