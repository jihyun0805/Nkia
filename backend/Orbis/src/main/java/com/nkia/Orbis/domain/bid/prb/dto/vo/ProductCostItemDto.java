package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
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
}
