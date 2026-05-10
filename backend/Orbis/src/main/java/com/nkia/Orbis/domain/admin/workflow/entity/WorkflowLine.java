package com.nkia.Orbis.domain.admin.workflow.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkflowLine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_step_id", nullable = false)
    private WorkflowStep workflowStep;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id", nullable = false)
    private User approver;

    @Column(nullable = false)
    private Integer stepOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkflowLineStatus status;

    private String comment;

    private LocalDateTime actedAt;

    public static WorkflowLine create(
            Workflow workflow,
            WorkflowStep workflowStep,
            User approver,
            WorkflowLineStatus status
    ) {
        WorkflowLine line = new WorkflowLine();
        line.workflow = workflow;
        line.workflowStep = workflowStep;
        line.approver = approver;
        line.stepOrder = workflowStep.getStepOrder();
        line.status = status;
        return line;
    }

    public void approve(String comment) {
        this.status = WorkflowLineStatus.APPROVED;
        this.comment = comment;
        this.actedAt = LocalDateTime.now();
    }

    public void reject(String comment) {
        this.status = WorkflowLineStatus.REJECTED;
        this.comment = comment;
        this.actedAt = LocalDateTime.now();
    }

    public void pending() {
        this.status = WorkflowLineStatus.PENDING;
    }
}
