package com.nkia.Orbis.domain.admin.workflow.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkflowStep extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_template_id", nullable = false)
    private WorkflowTemplate workflowTemplate;

    @Column(nullable = false)
    private Integer stepOrder;

    @Column(nullable = false)
    private String stepName;

    @Column(nullable = false)
    private Boolean required;

    @Column(nullable = false)
    private Boolean active;

    public static WorkflowStep create(
            WorkflowTemplate workflowTemplate,
            Integer stepOrder,
            String stepName,
            Boolean required
    ) {
        WorkflowStep step = new WorkflowStep();
        step.workflowTemplate = workflowTemplate;
        step.stepOrder = stepOrder;
        step.stepName = stepName;
        step.required = required;
        step.active = true;
        return step;
    }

    public void update(
            Integer stepOrder,
            String stepName,
            Boolean required,
            Boolean active
    ) {
        this.stepOrder = stepOrder;
        this.stepName = stepName;
        this.required = required;
        this.active = active;
    }

    public void deactivate() {
        this.active = false;
    }
}
