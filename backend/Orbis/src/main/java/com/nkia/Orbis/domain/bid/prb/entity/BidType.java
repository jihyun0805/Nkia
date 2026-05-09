package com.nkia.Orbis.domain.bid.prb.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum BidType {
  SELF_BID_SELF_EVAL("자체 입찰/자체 평가"),
  PROCUREMENT_BID_PROCUREMENT_EVAL("조달 입찰/조달 평가"),
  PROCUREMENT_ENTRUST_SELF_EVAL("조달 위탁/자체 평가");

  private final String description;
}
