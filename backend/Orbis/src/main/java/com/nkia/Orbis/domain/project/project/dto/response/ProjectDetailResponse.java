package com.nkia.Orbis.domain.project.project.dto.response;

import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectDetailResponse {

    private Long id;
    private String pjtNumber;
    private String pjtName;
    private String customerName;
    private Long totalAmount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String pmName;
    private String salesRepName;
    private ResultReportInfo resultReport;

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

    public static ProjectDetailResponse from(Project project, ProjectResultReport latestReport) {
        String customer = (project.getOrderReport() != null && project.getOrderReport().getFinalCustomerCompany() != null)
                ? project.getOrderReport().getFinalCustomerCompany().getName() : null;

        ResultReportInfo reportInfo = null;
        if (latestReport != null) {
            Long fileId = latestReport.getResultReportFile().getId();
            String name = latestReport.getResultReportFile().getOriginalFileName();

            reportInfo = ResultReportInfo.builder()
                    .id(fileId)
                    .fileName(name)
                    .fileSize(latestReport.getResultReportFile().getFileSize())
                    .fileUrl("/api/v1/files/download/" + latestReport.getId())
                    .build();
        }

        return ProjectDetailResponse.builder()
                .id(project.getId())
                .pjtNumber(project.getPjtNumber())
                .pjtName(project.getPjtName())
                .customerName(customer)
                .totalAmount(project.getTotalAmount())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .pmName(project.getManager() != null ? project.getManager().getName() : null)
                .salesRepName(project.getSalesRepresentative() != null ? project.getSalesRepresentative().getName() : null)
                .resultReport(reportInfo)
                .build();
    }
}
