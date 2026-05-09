package com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RfpStatus {
  RECEIVED("접수"),
  ANALYZING("분석중"),
  COMPLETED("완료");

  private final String description;
}
