package com.nkia.Orbis.domain.project.project.dto.response;

import com.nkia.Orbis.domain.project.project.entity.ProjectHistory;
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
public class ProjectHistoryDetailResponse {

    private Long historyId;
    private Long originalProjectId;
    private String pjtNumber;
    private String pjtName;
    private String customerName;
    private Long totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String pmName;
    private String salesRepName;
    private ResultReportInfo resultReport;

    private Long orderReportId;
    private Long contractId;
    private LocalDateTime savedAt;

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ResultReportInfo {
        private Long id;
        private String fileName;
        private Long fileSize;
        private String fileUrl;
    }

    public static ProjectHistoryDetailResponse from(ProjectHistory history) {
        ResultReportInfo reportInfo = null;

        if (history.isHasResultReport()) {
            reportInfo = ResultReportInfo.builder()
                    .id(history.getResultReportFileId())
                    .fileName(history.getResultReportFileName())
                    .fileSize(history.getResultReportFileSize())
                    .fileUrl(history.getResultReportFileUrl())
                    .build();
        }

        return ProjectHistoryDetailResponse.builder()
                .historyId(history.getId())
                .originalProjectId(history.getOriginalProjectId())
                .orderReportId(history.getOrderReportId())
                .contractId(history.getContractId())
                .pjtNumber(history.getPjtNumber())
                .pjtName(history.getPjtName())
                .customerName(history.getCustomerName())
                .totalAmount(history.getTotalAmount())
                .startDate(history.getStartDate())
                .endDate(history.getEndDate())
                .pmName(history.getPmName())
                .salesRepName(history.getSalesRepName())
                .resultReport(reportInfo)
                .savedAt(history.getCreatedAt())
                .build();
    }
}
