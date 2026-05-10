package com.nkia.Orbis.domain.bid.prb.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum EngineerGrade {
  SPECIAL("특급"), ADVANCED("고급"), INTERMEDIATE("중급"), BEGINNER("초급");

  private final String description;
}
