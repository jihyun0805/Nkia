package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpRequirement;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.SupportType;

import java.math.BigDecimal;

public record RfpRequirementRequest(Long id, // 수정(Update) 시 기존 엔티티 매핑을 위해 필요 (등록 시에는 null)
    String category, String requirementCode, String name, String description,
    SupportType supportType, String reviewComment, BigDecimal effort) {
  public RfpRequirement toEntity() {
    return RfpRequirement.builder()
        .category(this.category())
        .requirementCode(this.requirementCode())
        .name(this.name())
        .description(this.description())
        .supportType(this.supportType())
        .reviewComment(this.reviewComment())
        .effort(this.effort())
        .build();
  }
}
