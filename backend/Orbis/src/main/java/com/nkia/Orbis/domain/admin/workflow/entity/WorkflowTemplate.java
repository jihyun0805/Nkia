package com.nkia.Orbis.domain.admin.workflow.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@SQLRestriction("deleted = false")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkflowTemplate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkflowDomain workflowDomain;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Boolean active;

    public static WorkflowTemplate create(
            WorkflowDomain workflowDomain,
            String name
    ) {
        WorkflowTemplate template = new WorkflowTemplate();
        template.workflowDomain = workflowDomain;
        template.name = name;
        template.active = true;
        return template;
    }

    public void update(String name, Boolean active) {
        this.name = name;
        this.active = active;
    }

    public void deactivate() {
        this.active = false;
    }
}
