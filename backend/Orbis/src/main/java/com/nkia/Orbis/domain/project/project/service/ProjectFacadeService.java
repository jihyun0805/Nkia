package com.nkia.Orbis.domain.project.project.service;

import com.nkia.Orbis.domain.project.project.dto.request.ProjectCombinedUpdateRequest;
import com.nkia.Orbis.domain.project.project.dto.response.ProjectDetailResponse;
import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.projectresultreport.service.ProjectResultReportService;
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

    /**
     * 사업 정보를 수정하고, 수정된 최신 상세 정보를 반환합니다.
     */
    @Transactional
    public ProjectDetailResponse updateProjectWithReport(Long projectId, ProjectCombinedUpdateRequest request) {
        Project project = projectService.getProject(projectId);

        projectService.updateProject(project, request);
        reportService.updateReportFileByProject(project, request.getFileId());

        return projectService.getProjectDetail(project);
    }

}