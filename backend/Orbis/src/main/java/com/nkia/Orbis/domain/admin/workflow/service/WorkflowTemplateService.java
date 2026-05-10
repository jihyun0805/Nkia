package com.nkia.Orbis.domain.admin.workflow.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.WorkflowErrorCode;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowStepCreateRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowTemplateCreateRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.request.WorkflowTemplateUpdateRequest;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowStepResponse;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowTemplateResponse;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStep;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowTemplate;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowStepRepository;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowTemplateRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkflowTemplateService {

    private final WorkflowTemplateRepository workflowTemplateRepository;
    private final WorkflowStepRepository workflowStepRepository;

    @Transactional
    public WorkflowTemplateResponse create(WorkflowTemplateCreateRequest request) {

        workflowTemplateRepository.findByWorkflowDomainAndActiveTrue(request.getWorkflowDomain())
                .ifPresent(template -> {
                    throw new ApiException(WorkflowErrorCode.DUPLICATE_WORKFLOW_TEMPLATE);
                });

        WorkflowTemplate template = WorkflowTemplate.create(
                request.getWorkflowDomain(),
                request.getName()
        );

        workflowTemplateRepository.save(template);

        List<WorkflowStepResponse> stepResponses = new ArrayList<>();

        for (WorkflowStepCreateRequest stepRequest : request.getSteps()) {
            WorkflowStep step = WorkflowStep.create(
                    template,
                    stepRequest.getStepOrder(),
                    stepRequest.getStepName(),
                    stepRequest.getApproverPosition(),
                    stepRequest.getRequired()
            );

            workflowStepRepository.save(step);

            stepResponses.add(WorkflowStepResponse.from(step));
        }

        return WorkflowTemplateResponse.from(template, stepResponses);
    }

    @Transactional
    public WorkflowTemplateResponse update(
            Long workflowTemplateId,
            WorkflowTemplateUpdateRequest request
    ) {
        WorkflowTemplate template = workflowTemplateRepository.findById(workflowTemplateId)
                .orElseThrow(() ->
                        new ApiException(WorkflowErrorCode.ACTIVE_WORKFLOW_NOT_FOUND)
                );

        template.update(
                request.getName(),
                request.isActive()
        );

        // 기존 step 비활성화
        List<WorkflowStep> steps =
                workflowStepRepository
                        .findByWorkflowTemplateAndActiveTrueOrderByStepOrderAsc(template);

        for (WorkflowStep step : steps) {
            step.deactivate();
        }

        // 새 step 생성
        List<WorkflowStepResponse> stepResponses = new ArrayList<>();

        for (WorkflowStepCreateRequest stepRequest : request.getSteps()) {

            WorkflowStep newStep = WorkflowStep.create(
                    template,
                    stepRequest.getStepOrder(),
                    stepRequest.getStepName(),
                    stepRequest.getApproverPosition(),
                    stepRequest.getRequired()
            );

            workflowStepRepository.save(newStep);

            stepResponses.add(
                    WorkflowStepResponse.from(newStep)
            );
        }

        return WorkflowTemplateResponse.from(
                template,
                stepResponses
        );
    }
}
