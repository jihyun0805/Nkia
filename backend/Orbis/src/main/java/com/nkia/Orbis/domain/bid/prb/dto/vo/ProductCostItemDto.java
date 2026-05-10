package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.bid.prb.entity.ProductCostItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductCostItemDto {
  private Long productModuleId;         // 마스터 모듈 ID
  private ProductClass productClass;    // 모듈 구분 (스냅샷)
  private String productName;           // 모듈명 (스냅샷)
  private Integer quantity;             // 수량
  private BigDecimal listPrice;         // 소비자가
  private BigDecimal itemProductCost;   // 제품 원가 (Request 시 null 허용, Response 시 2% 계산값 포함)

  public ProductCostItem toEntity() {
    // 생성 시 원가 2%가 자동 계산됩니다.
    return new ProductCostItem(productModuleId, productClass, productName, quantity, listPrice);
  }

  public static ProductCostItemDto from(ProductCostItem entity) {
    if (entity == null)
      return null;
    return ProductCostItemDto.builder()
        .productModuleId(entity.getProductModuleId())
        .productClass(entity.getProductClass())
        .productName(entity.getProductName())
        .quantity(entity.getQuantity())
        .listPrice(entity.getListPrice())
        .itemProductCost(entity.getItemProductCost()) // 2% 원가 포함
        .build();
  }
}
