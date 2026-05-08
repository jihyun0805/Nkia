package com.nkia.Orbis.domain.project.projectresultreport.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UploadFileErrorCode;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.project.projectresultreport.dto.request.ProjectResultReportCreateRequest;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import com.nkia.Orbis.domain.project.projectresultreport.repository.ProjectResultReportRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProjectResultReportService {
    private final ProjectRepository projectRepository;
    private final ProjectResultReportRepository reportRepository;
    private final UploadFileRepository uploadFileRepository;

    /**
     * 사업 결과보고 정보를 등록합니다.
     */
    @Transactional
    public Long registerResultReport(ProjectResultReportCreateRequest dto) {
        Project project = getValidProject(dto.getProjectId());

        UploadFile resultReportFile = getUploadFile(dto.getFileId());

        ProjectResultReport report = ProjectResultReport.create(project, resultReportFile);

        return reportRepository.save(report).getId();
    }

    /**
     * 사업 엔티티를 기반으로 결과보고서의 첨부파일을 수정합니다.
     */
    @Transactional
    public void updateReportFileByProject(Project project, Long fileId) {
        if (fileId == null) {
            reportRepository.findByProject(project).ifPresent(report -> {
                if (report.getResultReportFile() != null) {
                    report.getResultReportFile().delete();
                }
                report.delete();
            });
            return;
        }

        ProjectResultReport report = reportRepository.findByProject(project).orElse(null);
        UploadFile uploadFile = getUploadFile(fileId);

        if (report != null) {
            report.updateResultReport(uploadFile);
        } else {
            ProjectResultReport newReport = ProjectResultReport.create(project, uploadFile);
            reportRepository.save(newReport);
        }
    }

    /**
     * 사업에 속한 결과보고서를 삭제합니다.
     */
    @Transactional
    public void deleteReportByProject(Project project) {
        reportRepository.findByProject(project).ifPresent(report -> {
            if (report.getResultReportFile() != null) {
                report.getResultReportFile().delete();
            }
            report.delete();
        });
    }

    /**
     * 사업 결과보고를 삭제합니다.
     */
    @Transactional
    public void deleteReport(Long reportId) {
        ProjectResultReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.RESULT_REPORT_NOT_FOUND));

        report.delete();
    }

    private Project getValidProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));

        if (reportRepository.existsByProject(project)) {
            throw new ApiException(ProjectErrorCode.RESULT_REPORT_ALREADY_EXISTS);

        }
        return project;
    }

    /**
     * 파일 ID를 통해 UploadFile 엔티티를 조회합니다.
     */
    private UploadFile getUploadFile(Long fileId) {
        if (fileId == null) {
            return null;
        }
        return uploadFileRepository.findById(fileId)
                .orElseThrow(() -> new ApiException(UploadFileErrorCode.FILE_NOT_FOUND));
    }
}
