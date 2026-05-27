package com.nkia.Orbis.domain.admin.workflow.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Workflow extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkflowDomain workflowDomain;

    @Column(nullable = false)
    private Long targetId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_template_id", nullable = false)
    private WorkflowTemplate workflowTemplate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkflowStatus status;

    @Column(nullable = false)
    private Integer currentStepOrder;

    @OneToMany(
            mappedBy = "workflow",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<WorkflowLine> workflowLines = new ArrayList<>();

    public static Workflow create(
            WorkflowDomain workflowDomain,
            Long targetId,
            WorkflowTemplate workflowTemplate,
            User requester
    ) {
        Workflow instance = new Workflow();
        instance.workflowDomain = workflowDomain;
        instance.targetId = targetId;
        instance.workflowTemplate = workflowTemplate;
        instance.requester = requester;
        instance.status = WorkflowStatus.IN_PROGRESS;
        instance.currentStepOrder = 1;
        return instance;
    }

    public void approveNext(Integer nextStepOrder) {
        this.currentStepOrder = nextStepOrder;
    }

    public void approveComplete() {
        this.status = WorkflowStatus.APPROVED;
        this.currentStepOrder = 0;
    }

    public void reject() {
        this.status = WorkflowStatus.REJECTED;
    }

    public void cancel() {
        this.status = WorkflowStatus.CANCELED;
    }

    public void addLine(WorkflowLine line) {
        this.workflowLines.add(line);
    }
}
