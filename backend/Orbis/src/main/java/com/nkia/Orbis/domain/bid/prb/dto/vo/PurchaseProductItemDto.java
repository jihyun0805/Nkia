package com.nkia.Orbis.domain.bid.prb.dto.vo;

import com.nkia.Orbis.domain.bid.prb.entity.PurchaseProduct;
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

  public PurchaseProduct toEntity() {
    return new PurchaseProduct(vendorName, productName, quantity, totalAmount);
  }

  public static PurchaseProductItemDto from(PurchaseProduct entity) {
    if (entity == null)
      return null;
    return PurchaseProductItemDto.builder()
        .vendorName(entity.getVendorName())
        .productName(entity.getProductName())
        .quantity(entity.getQuantity())
        .totalAmount(entity.getTotalAmount())
        .build();
  }
}
