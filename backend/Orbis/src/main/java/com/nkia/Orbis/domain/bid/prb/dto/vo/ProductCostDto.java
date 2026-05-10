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
public class ProductCostDto {
  private List<ProductCostItemDto> items;
  private BigDecimal totalListPrice;
  private BigDecimal totalProductCost;
}
