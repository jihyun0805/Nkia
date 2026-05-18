package com.nkia.Orbis.domain.project.project.entity;

import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ProjectHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long originalProjectId;

    private Long orderReportId;
    private Long contractId;

    private String pjtNumber;
    private String pjtName;
    private String customerName;
    private Long totalAmount;
    
    private LocalDate startDate;
    private LocalDate endDate;
    
    private String pmName;
    private String salesRepName;

    // 결과보고서 관련 필드
    private boolean hasResultReport;
    private Long resultReportFileId;
    private String resultReportFileName;
    private Long resultReportFileSize;
    private String resultReportFileUrl;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public ProjectHistory(Long originalProjectId, Long orderReportId, Long contractId, String pjtNumber, String pjtName,
                          String customerName, Long totalAmount, LocalDate startDate, LocalDate endDate,
                          String pmName, String salesRepName, boolean hasResultReport, Long resultReportFileId,
                          String resultReportFileName, Long resultReportFileSize, String resultReportFileUrl) {
        this.originalProjectId = originalProjectId;
        this.orderReportId = orderReportId;
        this.contractId = contractId;
        this.pjtNumber = pjtNumber;
        this.pjtName = pjtName;
        this.customerName = customerName;
        this.totalAmount = totalAmount;
        this.startDate = startDate;
        this.endDate = endDate;
        this.pmName = pmName;
        this.salesRepName = salesRepName;
        this.hasResultReport = hasResultReport;
        this.resultReportFileId = resultReportFileId;
        this.resultReportFileName = resultReportFileName;
        this.resultReportFileSize = resultReportFileSize;
        this.resultReportFileUrl = resultReportFileUrl;
    }

    public static ProjectHistory createSnapshot(Project project, ProjectResultReport latestReport) {
        String customer = (project.getOrderReport() != null && project.getOrderReport().getFinalCustomerCompany() != null)
                ? project.getOrderReport().getFinalCustomerCompany().getName() : null;

        String pm = (project.getManager() != null)
                ? project.getManager().getName()
                : (project.getOrderReport() != null && project.getOrderReport().getPm() != null
                        ? project.getOrderReport().getPm().getName() : null);

        String salesRep = (project.getSalesRepresentative() != null)
                ? project.getSalesRepresentative().getName() : null;

        Long orderReportId = project.getOrderReport() != null ? project.getOrderReport().getId() : null;
        Long contractId = (project.getOrderReport() != null && project.getOrderReport().getContract() != null) 
                ? project.getOrderReport().getContract().getId() : null;

        boolean hasReport = false;
        Long reportFileId = null;
        String reportFileName = null;
        Long reportFileSize = null;
        String reportFileUrl = null;

        if (latestReport != null && latestReport.getResultReportFile() != null) {
            hasReport = true;
            reportFileId = latestReport.getResultReportFile().getId();
            reportFileName = latestReport.getResultReportFile().getOriginalFileName();
            reportFileSize = latestReport.getResultReportFile().getFileSize();
            reportFileUrl = "/api/v1/files/download/" + latestReport.getId();
        }

        return ProjectHistory.builder()
                .originalProjectId(project.getId())
                .orderReportId(orderReportId)
                .contractId(contractId)
                .pjtNumber(project.getPjtNumber())
                .pjtName(project.getPjtName())
                .customerName(customer)
                .totalAmount(project.getTotalAmount())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .pmName(pm)
                .salesRepName(salesRep)
                .hasResultReport(hasReport)
                .resultReportFileId(reportFileId)
                .resultReportFileName(reportFileName)
                .resultReportFileSize(reportFileSize)
                .resultReportFileUrl(reportFileUrl)
                .build();
    }
}
