package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response;

import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpStatus;

import java.time.LocalDateTime;

public record RfpAnalyzeResultListResponse(
    Long id,
    String projectName,      // 식별을 위해 추가 권장
    LocalDateTime requestDate, // BaseEntity의 createdAt 매핑
    LocalDateTime deadline,    // proposalDeadline 매핑
    RfpStatus status           // RFP 분석 상태
) {
  public static RfpAnalyzeResultListResponse from(RfpAnalyzeResult entity) {
    return new RfpAnalyzeResultListResponse(
        entity.getId(),
        entity.getProjectName(),
        entity.getCreatedAt(), // BaseEntity에서 상속받은 생성일
        entity.getProposalDeadline(),
        entity.getStatus()
    );
  }
}
