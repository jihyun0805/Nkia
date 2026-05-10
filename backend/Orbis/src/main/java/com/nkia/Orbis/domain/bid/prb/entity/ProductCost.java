package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProductCost {

  @ElementCollection
  @CollectionTable(name = "prb_product_cost_item", joinColumns = @JoinColumn(name = "prb_id"))
  private List<ProductCostItem> items = new ArrayList<>();

  @Column(name = "total_list_price", precision = 15, scale = 2)
  private BigDecimal totalListPrice = BigDecimal.ZERO;

  @Column(name = "total_product_cost", precision = 15, scale = 2)
  private BigDecimal totalProductCost = BigDecimal.ZERO;

  /**
   * 제품 원가 리스트 갱신 및 합계 계산
   */
  public void updateItems(List<ProductCostItem> newItems) {
    this.items.clear();
    if (newItems != null) {
      this.items.addAll(newItems);
    }
    calculateAggregations();
  }

  private void calculateAggregations() {
    this.totalListPrice = this.items.stream()
        .map(ProductCostItem::getListPrice)
        .filter(Objects::nonNull)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    this.totalProductCost = this.items.stream()
        .map(ProductCostItem::getItemProductCost)
        .filter(Objects::nonNull)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }
}
