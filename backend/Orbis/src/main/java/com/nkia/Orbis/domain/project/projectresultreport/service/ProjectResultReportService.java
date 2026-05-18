package com.nkia.Orbis.domain.project.projectresultreport.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UploadFileErrorCode;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.entity.ProjectHistory;
import com.nkia.Orbis.domain.project.project.repository.ProjectHistoryRepository;
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
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectResultReportService {
    private final ProjectRepository projectRepository;
    private final ProjectHistoryRepository projectHistoryRepository;
    private final ProjectResultReportRepository reportRepository;
    private final UploadFileRepository uploadFileRepository;

    /**
     * 사업 결과보고 정보 등록
     */
    @Transactional
    public Long registerResultReport(ProjectResultReportCreateRequest dto) {
        Project project = getValidProject(dto.getProjectId());

        UploadFile resultReportFile = getUploadFile(dto.getFileId());

        ProjectResultReport report = ProjectResultReport.create(project, resultReportFile);
        ProjectResultReport savedReport = reportRepository.save(report);

        projectHistoryRepository.save(ProjectHistory.createSnapshot(project, savedReport));

        return savedReport.getId();
    }

    /**
     * 결과보고서의 첨부파일 수정
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
            reportRepository.save(report);
            projectHistoryRepository.save(ProjectHistory.createSnapshot(project, report));
        } else {
            ProjectResultReport newReport = ProjectResultReport.create(project, uploadFile);
            reportRepository.save(newReport);
            projectHistoryRepository.save(ProjectHistory.createSnapshot(project, newReport));
        }
    }

    /**
     * 사업 결과보고 삭제
     */
    @Transactional
    public void deleteReport(Long reportId) {
        ProjectResultReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.RESULT_REPORT_NOT_FOUND));

        Project project = report.getProject();
        report.delete();

        // 삭제 후 상태로 스냅샷 저장
        projectHistoryRepository.save(ProjectHistory.createSnapshot(project, null));
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
     * 파일 ID를 통해 UploadFile 엔티티 조회
     */
    private UploadFile getUploadFile(Long fileId) {
        if (fileId == null) {
            return null;
        }
        return uploadFileRepository.findById(fileId)
                .orElseThrow(() -> new ApiException(UploadFileErrorCode.FILE_NOT_FOUND));
    }
}
