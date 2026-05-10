package com.nkia.Orbis.domain.admin.workflow.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.WorkflowErrorCode;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowStepCreateRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowTemplateCreateRequest;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStep;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowTemplate;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowStepRepository;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkflowTemplateService {

    private final WorkflowTemplateRepository workflowTemplateRepository;
    private final WorkflowStepRepository workflowStepRepository;

    @Transactional
    public WorkflowTemplate create(WorkflowTemplateCreateRequest request) {

        workflowTemplateRepository.findByWorkflowDomainAndActiveTrue(request.getWorkflowDomain())
                .ifPresent(template -> {
                    throw new ApiException(WorkflowErrorCode.DUPLICATE_WORKFLOW_TEMPLATE);
                });

        WorkflowTemplate template = WorkflowTemplate.create(
                request.getWorkflowDomain(),
                request.getName()
        );

        workflowTemplateRepository.save(template);

        for (WorkflowStepCreateRequest stepRequest : request.getSteps()) {
            WorkflowStep step = WorkflowStep.create(
                    template,
                    stepRequest.getStepOrder(),
                    stepRequest.getStepName(),
                    stepRequest.getApproverPosition(),
                    stepRequest.getRequired()
            );

            workflowStepRepository.save(step);
        }

        return template;
    }
}
