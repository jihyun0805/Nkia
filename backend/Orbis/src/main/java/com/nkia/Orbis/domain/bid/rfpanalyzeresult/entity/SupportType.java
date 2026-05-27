package com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupportType {
  PROVIDED("기능 제공"),
  NOT_PROVIDED("기능 미제공"),
  PARTIAL_CUSTOMIZATION("기능 일부 제공, 개발 필요"),
  NEEDS_REVIEW("요건 확인 필요");

  private final String description;
}
