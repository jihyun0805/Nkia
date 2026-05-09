package com.nkia.Orbis.domain.project.projectresultreport.repository;

import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.projectresultreport.entity.ProjectResultReport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectResultReportRepository extends JpaRepository<ProjectResultReport, Long> {
    boolean existsByProject(Project project);
    Optional<ProjectResultReport> findByProject(Project project);
}
