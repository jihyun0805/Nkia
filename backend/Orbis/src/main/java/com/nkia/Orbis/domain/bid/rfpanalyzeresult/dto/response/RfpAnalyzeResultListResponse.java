package com.nkia.Orbis.domain.bid.rfpanalyzeresult.dto.response;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpAnalyzeResult;
import com.nkia.Orbis.domain.bid.rfpanalyzeresult.entity.RfpStatus;

import java.time.LocalDateTime;

public record RfpAnalyzeResultListResponse(
    Long id,
    String projectName,      // 식별을 위해 추가 권장
    String requesterName, // 요청자(등록자) 이름
    String assigneeName,  // 담당자 이름
    LocalDateTime requestDate, // BaseEntity의 createdAt 매핑
    LocalDateTime deadline,    // proposalDeadline 매핑
    RfpStatus status           // RFP 분석 상태
) {
  public static RfpAnalyzeResultListResponse from(RfpAnalyzeResult entity, User creator) {
    return new RfpAnalyzeResultListResponse(
        entity.getId(),
        entity.getProjectName(),

        // 💡 3. Null Safe 매핑: 요청자가 없을 경우 "알 수 없음"
        creator != null ? creator.getName() : "알 수 없음",

        // 💡 4. Null Safe 매핑: 담당자가 아직 배정되지 않았을 경우 "미정"
        entity.getAssignee() != null ? entity.getAssignee().getName() : "미정",

        entity.getCreatedAt(),
        entity.getProposalDeadline(),
        entity.getStatus()
    );
  }
}
