package com.nkia.Orbis.domain.project.projecthistory.dto.response;

import com.nkia.Orbis.domain.project.projecthistory.entity.ProjectHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectHistoryListResponse {

    private Long historyId;
    private Long originalProjectId;
    private String customerName;
    private String projectName;
    private Long totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String pmName;
    private String salesRepresentativeName;
    private boolean hasResultReport;
    private LocalDateTime savedAt;

    public static ProjectHistoryListResponse from(ProjectHistory history) {
        return ProjectHistoryListResponse.builder()
                .historyId(history.getId())
                .originalProjectId(history.getOriginalProjectId())
                .customerName(history.getCustomerName())
                .projectName(history.getPjtName())
                .totalAmount(history.getTotalAmount())
                .startDate(history.getStartDate())
                .endDate(history.getEndDate())
                .pmName(history.getPmName())
                .salesRepresentativeName(history.getSalesRepName())
                .hasResultReport(history.isHasResultReport())
                .savedAt(history.getCreatedAt())
                .build();
    }
}
