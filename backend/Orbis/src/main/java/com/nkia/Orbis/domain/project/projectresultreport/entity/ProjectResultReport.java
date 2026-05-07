package com.nkia.Orbis.domain.project.projectresultreport.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class ProjectResultReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "result_report_file_id")
    private UploadFile resultReportFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    // 사업 기간
    private LocalDate startDate;
    private LocalDate endDate;

    @Builder
    public ProjectResultReport(Project project, UploadFile resultReportFile, User manager,  LocalDate startDate, LocalDate endDate) {
        this.project = project;
        this.resultReportFile = resultReportFile;
        this.manager = manager;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public static ProjectResultReport create(Project project, User manager, UploadFile fileId,  LocalDate startDate, LocalDate endDate) {
        return ProjectResultReport.builder()
                .project(project)
                .manager(manager)
                .resultReportFile(fileId)
                .startDate(startDate)
                .endDate(endDate)
                .build();
    }

    /**
     * 결과 보고서 정보를 업데이트합니다.
     */
    public void updateReport(UploadFile resultReportFile, String content, User manager, LocalDate startDate, LocalDate endDate) {
        this.resultReportFile = resultReportFile;
        this.content = content;
        this.manager = manager;
        this.startDate = startDate;
        this.endDate = endDate;
    }
}
