package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.Purchase;
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

  public static PurchaseDto from(Purchase entity) {
    if (entity == null)
      return null;
    return PurchaseDto.builder()
        .humanResources(
            entity.getHumanResources().stream().map(PurchaseHumanResourceItemDto::from).toList())
        .products(entity.getProducts().stream().map(PurchaseProductItemDto::from).toList())
        .serviceSubtotalManMonth(entity.getServiceSubtotalManMonth())
        .serviceSubtotalAmount(entity.getServiceSubtotalAmount())
        .productSubtotalAmount(entity.getProductSubtotalAmount())
        .totalPurchaseAmount(entity.getTotalPurchaseAmount())
        .build();
  }
}
