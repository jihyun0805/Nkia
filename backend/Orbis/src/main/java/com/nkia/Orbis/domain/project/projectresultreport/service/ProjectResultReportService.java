package com.nkia.Orbis.domain.project.projectresultreport.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UploadFileErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.project.projectresultreport.dto.request.ProjectResultReportCreateRequest;
import com.nkia.Orbis.domain.project.projectresultreport.dto.request.ProjectResultReportUpdateRequest;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import com.nkia.Orbis.domain.project.projectresultreport.repository.ProjectResultReportRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.repository.UploadFileRepository;
import com.nkia.Orbis.domain.user.entity.User;
import com.nkia.Orbis.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProjectResultReportService {
    private final ProjectRepository projectRepository;
    private final ProjectResultReportRepository reportRepository;
    private final UserRepository userRepository;
    private final UploadFileRepository uploadFileRepository;

    /**
     * 사업 결과보고 정보를 등록합니다.
     */
    @Transactional
    public Long registerResultReport(ProjectResultReportCreateRequest dto) {
        Project project = getValidProject(dto.getProjectId());

        User manager = userRepository.findById(dto.getManagerId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        project.updateResultInfo(manager, dto.getStartDate(), dto.getEndDate());

        UploadFile resultReportFile = getUploadFile(dto.getFileId());

        ProjectResultReport report = ProjectResultReport.create(project, manager, resultReportFile, dto.getStartDate(), dto.getEndDate());

        return reportRepository.save(report).getId();
    }

    /**
     * 사업 결과보고 정보를 수정합니다.
     */
    @Transactional
    public Long updateReport(Long reportId, ProjectResultReportUpdateRequest request) {
        ProjectResultReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.RESULT_REPORT_NOT_FOUND));

        User manager = userRepository.findById(request.getManagerId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        UploadFile uploadFile = getUploadFile(request.getFileId());

        report.updateReport(uploadFile, request.getContent(), manager,
                request.getStartDate(), request.getEndDate()
        );

        return report.getId();
    }

    /**
     * 사업 결과보고를 삭제합니다. (Soft Delete)
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
        if (fileId == null) return null;
        return uploadFileRepository.findById(fileId)
                .orElseThrow(() -> new ApiException(UploadFileErrorCode.FILE_NOT_FOUND));
    }
}
