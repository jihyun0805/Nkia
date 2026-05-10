package com.nkia.Orbis.domain.admin.workflow.repository;

import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            SELECT DISTINCT w
            FROM Workflow w
            LEFT JOIN FETCH w.workflowLines wl
            LEFT JOIN FETCH wl.workflowStep
            LEFT JOIN FETCH wl.approver
            WHERE w.createdBy = :userId
               OR wl.approver.id = :approverId
            ORDER BY w.createdAt DESC
            """)
    List<Workflow> findMyRelatedWorkflows(
            @Param("userId") String userId,
            @Param("approverId") UUID approverId
    );
}
