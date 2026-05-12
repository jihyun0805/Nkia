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

    Optional<WorkflowLine> findByWorkflowAndStepOrderAndStatus(
            Workflow workflow,
            Integer stepOrder,
            WorkflowLineStatus status
    );

    Optional<WorkflowLine> findByWorkflowIdAndStepOrder(Long workflowId, Integer stepOrder);
}
