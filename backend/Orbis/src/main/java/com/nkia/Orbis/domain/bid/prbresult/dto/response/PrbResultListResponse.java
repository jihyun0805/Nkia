package com.nkia.Orbis.domain.bid.prbresult.dto.response;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import java.time.LocalDateTime;

public record PrbResultListResponse(
        // PRB 결과 id
        Long id,
        // 고객사명
        String customerCompanyName,
        // 사업 기회명
        String opportunityName,
        // 제안서 마감일
        LocalDateTime proposalDeadlineDatetime,
        // 작성일
        String createdByUserName,
        // 작성자
        LocalDateTime createdAt
) {
    public static PrbResultListResponse of(PrbResult entity, User creator) {
        // Prb -> ProjectOpportunity -> Company 등 연관관계를 통해 값을 추출
        // N+1 문제가 발생하지 않도록 Repository에서 Fetch Join이 필수적입니다.
        String companyName = entity.getPrb().getProjectOpportunity().getCustomerCompany().getName();
        String opportunityName = entity.getPrb().getProjectOpportunity().getOpportunityName();
        LocalDateTime deadline = entity.getPrb().getProjectInfo().getProposalDeadlineDatetime();

        return new PrbResultListResponse(
                entity.getId(),
                companyName,
                opportunityName,
                deadline,
                creator != null ? creator.getName() : "알 수 없음",
                entity.getCreatedAt()
        );
    }
}