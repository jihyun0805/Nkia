package com.nkia.Orbis.domain.project.projectresultreport.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.repository.ProjectRepository;
import com.nkia.Orbis.domain.project.projectresultreport.dto.request.ProjectResultReportCreateRequest;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import com.nkia.Orbis.domain.project.projectresultreport.repository.ProjectResultReportRepository;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
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

    @Transactional
    public Long registerResultReport(ProjectResultReportCreateRequest dto) {
        Project project = getValidProject(dto.getProjectId());

        User manager = userRepository.findById(dto.getManagerId())
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        project.updateResultInfo(manager, dto.getStartDate(), dto.getEndDate());

        // TODO: 파일 업로드 도메인 연동 후 아래 로직으로 교체
        UploadFile resultReportFile = null;

        ProjectResultReport report = ProjectResultReport.create(project, manager, resultReportFile);

        return reportRepository.save(report).getId();
    }

    private Project getValidProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(ProjectErrorCode.PROJECT_NOT_FOUND));

        if (reportRepository.existsByProject(project)) {
            throw new ApiException(ProjectErrorCode.RESULT_REPORT_ALREADY_EXISTS);
        }
        return project;
    }
}
