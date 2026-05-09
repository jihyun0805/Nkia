package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.request;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.SupportType;

import java.math.BigDecimal;

public record RfpRequirementRequest(
    Long id, // 수정(Update) 시 기존 엔티티 매핑을 위해 필요 (등록 시에는 null)
    String category,
    String requirementCode,
    String name,
    String description,
    SupportType supportType,
    String reviewComment,
    BigDecimal effort
) {}
