package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.ProductCost;
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

  public static ProductCostDto from(ProductCost entity) {
    if (entity == null)
      return null;
    return ProductCostDto.builder()
        .items(entity.getItems().stream().map(ProductCostItemDto::from).toList())
        .totalListPrice(entity.getTotalListPrice())
        .totalProductCost(entity.getTotalProductCost())
        .build();
  }
}
