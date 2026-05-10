package com.nkia.Orbis.domain.admin.workflow.repository;

import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStep;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowTemplate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowStepRepositoy extends JpaRepository<WorkflowStep, Long> {
    List<WorkflowStep> findByWorkflowTemplateAndActiveTrueOrderByStepOrderAsc(
            WorkflowTemplate workflowTemplate
    );
}
