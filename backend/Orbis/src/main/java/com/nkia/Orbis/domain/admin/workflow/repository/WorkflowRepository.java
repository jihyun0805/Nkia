package com.nkia.Orbis.domain.admin.workflow.repository;

import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowRepository extends JpaRepository<Workflow, Long> {
    Optional<Workflow> findByWorkflowDomainAndTargetId(
            WorkflowDomain workflowDomain,
            Long targetId
    );

    Optional<Workflow> findByWorkflowDomainAndTargetIdAndStatus(
            WorkflowDomain workflowDomain,
            Long targetId,
            WorkflowStatus status
    );
}
