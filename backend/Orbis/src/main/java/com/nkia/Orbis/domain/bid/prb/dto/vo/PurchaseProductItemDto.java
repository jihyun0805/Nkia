package com.nkia.Orbis.domain.bid.prb.dto.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseProductItemDto {
  private String vendorName;            // 업체명
  private String productName;           // 제품명
  private Integer quantity;             // 수량
  private BigDecimal totalAmount;       // 금액
}
