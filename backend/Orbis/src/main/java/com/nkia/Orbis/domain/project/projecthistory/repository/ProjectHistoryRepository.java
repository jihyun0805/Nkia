package com.nkia.Orbis.domain.project.projecthistory.repository;

import com.nkia.Orbis.domain.project.projecthistory.entity.ProjectHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectHistoryRepository extends JpaRepository<ProjectHistory, Long> {
    List<ProjectHistory> findByOriginalProjectIdOrderByCreatedAtDesc(Long originalProjectId);
}
