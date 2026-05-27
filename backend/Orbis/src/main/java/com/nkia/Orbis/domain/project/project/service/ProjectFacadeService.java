package com.nkia.Orbis.domain.project.project.service;

import com.nkia.Orbis.domain.project.project.dto.request.ProjectCombinedUpdateRequest;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectDetailResponse;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.projecthistory.entity.ProjectHistory;
import com.nkia.Orbis.domain.project.projecthistory.repository.ProjectHistoryRepository;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import com.nkia.Orbis.domain.project.projectresultreport.service.ProjectResultReportService;
import java.util.Comparator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사업 도메인과 타 도메인을 엮어주는 Facade 서비스
 */
@Service
@RequiredArgsConstructor
public class ProjectFacadeService {

    private final ProjectService projectService;
    private final ProjectResultReportService reportService;
    private final ProjectHistoryRepository projectHistoryRepository;

    /**
     * 사업 정보를 수정하고, 수정된 최신 상세 정보 반환
     */
    @Transactional
    public ProjectDetailResponse updateProjectWithReport(Long projectId, ProjectCombinedUpdateRequest request) {
        Project project = projectService.getProject(projectId);

        ProjectResultReport latestReport = project.getResultReports().stream()
                .max(Comparator.comparing(ProjectResultReport::getCreatedAt))
                .orElse(null);
        projectHistoryRepository.save(ProjectHistory.createSnapshot(project, latestReport));

        projectService.updateProject(project, request);
        reportService.updateReportFileByProject(project, request.getFileId());

        return projectService.getProjectDetail(project);
    }

}