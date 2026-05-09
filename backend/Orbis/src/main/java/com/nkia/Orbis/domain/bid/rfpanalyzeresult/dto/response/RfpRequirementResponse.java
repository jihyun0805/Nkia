package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpRequirement;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.SupportType;

import java.math.BigDecimal;

public record RfpRequirementResponse(
    Long id,
    String category,
    String requirementCode,
    String name,
    String description,
    SupportType supportType,
    String reviewComment,
    BigDecimal effort
) {
  // 💡 정적 팩토리 메서드: 엔티티를 DTO로 변환하는 책임을 DTO 내부로 캡슐화
  public static RfpRequirementResponse from(RfpRequirement entity) {
    return new RfpRequirementResponse(
        entity.getId(),
        entity.getCategory(),
        entity.getRequirementCode(),
        entity.getName(),
        entity.getDescription(),
        entity.getSupportType(),
        entity.getReviewComment(),
        entity.getEffort()
    );
  }
}
