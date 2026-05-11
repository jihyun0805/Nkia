package com.nkia.Orbis.domain.project.projectresultreport.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "result_report_file_id")
    private UploadFile resultReportFile;

    @Builder
    public ProjectResultReport(Project project, UploadFile resultReportFile) {
        this.project = project;
        this.resultReportFile = resultReportFile;
    }

    public static ProjectResultReport create(Project project, UploadFile fileId) {
        return ProjectResultReport.builder()
                .project(project)
                .resultReportFile(fileId)
                .build();
    }

    public void updateResultReport(UploadFile resultReportFile) {
        this.resultReportFile = resultReportFile;
    }

    public void delete() {
        super.delete();
        if (this.resultReportFile != null) {
            this.resultReportFile.delete();
        }
    }
}
