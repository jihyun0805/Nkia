package com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProposalType {
  SI("SI 제안"),
  SELF("자체 제안");

  private final String description;
}
