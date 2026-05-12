package com.nkia.Orbis.domain.admin.workflow.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.UserErrorCode;
import com.nkia.Orbis.common.exception.errorcode.WorkflowErrorCode;
import com.nkia.Orbis.domain.admin.user.entity.Position;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.admin.user.repository.UserRepository;
import com.nkia.Orbis.domain.admin.workflow.dto.response.WorkflowResponse;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLine;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowLineStatus;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStep;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowTemplate;
import com.nkia.Orbis.domain.admin.workflow.handler.WorkflowDomainHandler;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowLineRepository;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowStepRepository;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowTemplateRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final WorkflowTemplateRepository workflowTemplateRepository;
    private final WorkflowStepRepository workflowStepRepository;
    private final WorkflowLineRepository workflowLineRepository;
    private final UserRepository userRepository;

    private final Map<WorkflowDomain, WorkflowDomainHandler> handlerMap;

    @Transactional
    public Workflow startWorkflow(
            WorkflowDomain workflowDomain,
            Long targetId,
            UUID requesterId,
            UUID firstApproverId
    ) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ApiException(UserErrorCode.USER_NOT_FOUND));

        // 1. 이미 진행중인 결재 존재하는지 검사
        validateDuplicateWorkflow(workflowDomain, targetId);

        // 2. 결재 프로세스 조회
        WorkflowTemplate template = workflowTemplateRepository
                .findByWorkflowDomainAndActiveTrue(workflowDomain)
                .orElseThrow(() -> new ApiException(WorkflowErrorCode.ACTIVE_WORKFLOW_NOT_FOUND));

        // 3. 워크플로우 생성
        Workflow workflow = Workflow.create(
                workflowDomain,
                targetId,
                template,
                requester
        );

        workflowRepository.save(workflow);

        // 4. 첫번째 Step 조회
        WorkflowStep firstStep = getStep(template, 1);

        // 5. 첫 결재자 조회
        User firstApprover = userRepository.findById(firstApproverId)
                .orElseThrow(() -> new ApiException(WorkflowErrorCode.WORKFLOW_APPROVER_NOT_FOUND));

        validateApproverPosition(firstStep, firstApprover);

        // 6. 워크플로우 라인 생성
        WorkflowLine firstLine = WorkflowLine.create(
                workflow,
                firstStep,
                firstApprover,
                WorkflowLineStatus.PENDING
        );

        workflow.addLine(firstLine);

        workflowLineRepository.save(firstLine);

        return workflow;
    }

    // 승인
    @Transactional
    public void approve(
            Long workflowId,
            UUID approverId,
            UUID nextApproverId,
            String comment
    ) {
        // 현재 워크플로우 + 워크플로우 라인 조회
        Workflow workflow = getWorkflow(workflowId);

        // 진행 상태 검사
        validateWorkflowProgress(workflow);

        WorkflowLine currentLine = getCurrentLine(workflow);

        // 결재 가능한지 검사
        validateApprover(currentLine, approverId);

        // 승인 처리
        currentLine.approve(comment);

        // 다음 스텝 조회
        Integer nextStepOrder = workflow.getCurrentStepOrder() + 1;

        Optional<WorkflowStep> nextStep = findStep(
                workflow.getWorkflowTemplate(),
                nextStepOrder
        );

        // 다음 단계가 없다면 최종 승인
        if (nextStep.isEmpty()) {
            workflow.approveComplete();
            handleApproved(workflow);
            return;
        }

        if (nextApproverId == null) {
            throw new ApiException(WorkflowErrorCode.WORKFLOW_APPROVER_NOT_FOUND);
        }

        // 다음 결재자 지정
        User nextApprover = userRepository.findById(nextApproverId)
                .orElseThrow(() -> new ApiException(WorkflowErrorCode.WORKFLOW_APPROVER_NOT_FOUND));

        validateApproverPosition(nextStep.get(), nextApprover);

        // 다음 워크플로우 라인 생성
        WorkflowLine nextLine = WorkflowLine.create(
                workflow,
                nextStep.get(),
                nextApprover,
                WorkflowLineStatus.PENDING
        );

        workflow.addLine(nextLine);
        workflowLineRepository.save(nextLine);

        workflow.approveNext(nextStepOrder);
    }

    // 반려
    @Transactional
    public void reject(
            Long workflowId,
            UUID approverId,
            String comment
    ) {
        Workflow workflow = getWorkflow(workflowId);

        validateWorkflowProgress(workflow);

        WorkflowLine currentLine = getCurrentLine(workflow);

        validateApprover(currentLine, approverId);

        currentLine.reject(comment);
        workflow.reject();
        handleRejected(workflow);
    }

    // 취소
    @Transactional
    public void cancel(Long workflowId) {
        Workflow workflow = getWorkflow(workflowId);

        validateWorkflowProgress(workflow);
        workflow.cancel();
        handleCancelled(workflow);
    }


    public Workflow getWorkflow(Long workflowId) {
        return workflowRepository.findById(workflowId)
                .orElseThrow(() -> new ApiException(WorkflowErrorCode.WORKFLOW_NOT_FOUND));
    }

    // 특정 도메인의 워크플로우 조회
    public Workflow getWorkflowByTarget(
            WorkflowDomain workflowDomain,
            Long targetId
    ) {
        return workflowRepository
                .findByWorkflowDomainAndTargetId(workflowDomain, targetId)
                .orElseThrow(() -> new ApiException(WorkflowErrorCode.WORKFLOW_NOT_FOUND));
    }

    // 결재 라인 목록 조회
    public List<WorkflowLine> getWorkflowLines(Long workflowId) {
        Workflow workflow = getWorkflow(workflowId);

        return workflowLineRepository.findByWorkflowOrderByStepOrderAsc(workflow);
    }

    // 현재 결재 라인 조회
    private WorkflowLine getCurrentLine(Workflow workflow) {
        return workflowLineRepository
                .findByWorkflowAndStepOrderAndStatus(
                        workflow,
                        workflow.getCurrentStepOrder(),
                        WorkflowLineStatus.PENDING
                )
                .orElseThrow(() -> new ApiException(WorkflowErrorCode.WORKFLOW_LINE_NOT_FOUND));
    }

    // 진행중인 워크플로우 존재 여부 검사
    private void validateDuplicateWorkflow(
            WorkflowDomain workflowDomain,
            Long targetId
    ) {
        boolean exists = workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        workflowDomain,
                        targetId,
                        WorkflowStatus.IN_PROGRESS
                )
                .isPresent();

        if (exists) {
            throw new ApiException(WorkflowErrorCode.DUPLICATE_WORKFLOW);
        }
    }

    // 결재 가능한지 확인
    private void validateApprover(
            WorkflowLine currentLine,
            UUID approverId
    ) {
        // 현재 라인의 결재자와 요청받은 결재자가 같은지 여부
        if (!currentLine.getApprover().getId().equals(approverId)) {
            throw new ApiException(WorkflowErrorCode.INVALID_WORKFLOW_APPROVER);
        }

        // 현재 라인의 상태가 pending 인지 여부
        if (currentLine.getStatus() != WorkflowLineStatus.PENDING) {
            throw new ApiException(WorkflowErrorCode.INVALID_WORKFLOW_STATUS);
        }
    }

    private WorkflowStep getStep(
            WorkflowTemplate template,
            Integer stepOrder
    ) {
        return findStep(template, stepOrder)
                .orElseThrow(() -> new ApiException(WorkflowErrorCode.WORKFLOW_STEP_NOT_FOUND));
    }

    private Optional<WorkflowStep> findStep(
            WorkflowTemplate template,
            Integer stepOrder
    ) {
        return workflowStepRepository
                .findByWorkflowTemplateAndStepOrderAndActiveTrue(
                        template,
                        stepOrder
                );
    }

    // 진행 상태 검사
    private void validateWorkflowProgress(Workflow workflow) {
        if (workflow.getStatus() != WorkflowStatus.IN_PROGRESS) {
            throw new ApiException(WorkflowErrorCode.INVALID_WORKFLOW_STATUS);
        }
    }

    // 포지션 검증
    private void validateApproverPosition(
            WorkflowStep workflowStep,
            User approver
    ) {
        Position requiredPosition = workflowStep.getApproverPosition();

        if (!approver.getPosition().isAtLeast(requiredPosition)) {
            throw new ApiException(WorkflowErrorCode.INVALID_WORKFLOW_APPROVER);
        }
    }

    @Transactional(readOnly = true)
    public List<WorkflowResponse> getMyWorkflows(UUID userId) {
        return workflowRepository.findMyRelatedWorkflows(
                        userId.toString(),
                        userId
                )
                .stream()
                .map(workflow -> {
                    long totalStepCount = workflowStepRepository
                            .countByWorkflowTemplateAndActiveTrue(
                                    workflow.getWorkflowTemplate()
                            );

                    boolean needNextApprover =
                            workflow.getStatus() == WorkflowStatus.IN_PROGRESS
                                    && workflow.getCurrentStepOrder() < totalStepCount;

                    return WorkflowResponse.from(workflow, needNextApprover);
                })
                .toList();
    }

    public WorkflowResponse toWorkflowResponse(Workflow workflow) {
        long totalStepCount = workflowStepRepository
                .countByWorkflowTemplateAndActiveTrue(
                        workflow.getWorkflowTemplate()
                );

        boolean needNextApprover =
                workflow.getStatus() == WorkflowStatus.IN_PROGRESS
                        && workflow.getCurrentStepOrder() < totalStepCount;

        return WorkflowResponse.from(workflow, needNextApprover);
    }

    private void handleApproved(Workflow workflow) {
        WorkflowDomainHandler handler = handlerMap.get(workflow.getWorkflowDomain());

        if (handler != null) {
            handler.onApproved(workflow.getTargetId());
        }
    }

    private void handleRejected(Workflow workflow) {
        WorkflowDomainHandler handler = handlerMap.get(workflow.getWorkflowDomain());

        if (handler != null) {
            handler.onRejected(workflow.getTargetId());
        }
    }

    private void handleCancelled(Workflow workflow) {
        WorkflowDomainHandler handler = handlerMap.get(workflow.getWorkflowDomain());

        if (handler != null) {
            handler.onCancelled(workflow.getTargetId());
        }
    }

    public WorkflowService(
            WorkflowRepository workflowRepository,
            WorkflowTemplateRepository workflowTemplateRepository,
            WorkflowStepRepository workflowStepRepository,
            WorkflowLineRepository workflowLineRepository,
            UserRepository userRepository,
            List<WorkflowDomainHandler> handlers
    ) {
        this.workflowRepository = workflowRepository;
        this.workflowTemplateRepository = workflowTemplateRepository;
        this.workflowStepRepository = workflowStepRepository;
        this.workflowLineRepository = workflowLineRepository;
        this.userRepository = userRepository;
        this.handlerMap = handlers.stream()
                .collect(Collectors.toMap(
                        WorkflowDomainHandler::getDomain,
                        handler -> handler
                ));
    }
}
