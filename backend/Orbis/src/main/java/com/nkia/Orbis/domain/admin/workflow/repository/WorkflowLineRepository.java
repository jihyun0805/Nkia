package com.nkia.Orbis.domain.admin.workflow.repository;

import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLine;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLineStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowLineRepository extends JpaRepository<WorkflowLine, Long> {
    List<WorkflowLine> findByWorkflowOrderByStepOrderAsc(
            Workflow workflow
    );

    Optional<WorkflowLine> findByWorkflowAndStepOrder(
            Workflow workflow,
            Integer stepOrder
    );

    Optional<WorkflowLine> findByWorkflowAndStatus(
            Workflow workflow,
            WorkflowLineStatus status
    );
}
