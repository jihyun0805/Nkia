package com.nkia.Orbis.domain.admin.workflow.init;

import com.nkia.Orbis.domain.admin.user.entity.Position;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStep;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowTemplate;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowStepRepository;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!no-seed")
@RequiredArgsConstructor
@Order(5)
public class WorkflowTemplateInitializer implements CommandLineRunner {

    private final WorkflowTemplateRepository workflowTemplateRepository;
    private final WorkflowStepRepository workflowStepRepository;

    @Override
    @Transactional
    public void run(String... args) {
        createTwoStepWorkflow(WorkflowDomain.QUOTATION, "견적 결재");
        createTwoStepWorkflow(WorkflowDomain.MAINTENANCE_QUOTATION, "유지보수 견적 결재");
        createTwoStepWorkflow(WorkflowDomain.ORDER_REPORT, "수주보고 결재");
        createTwoStepWorkflow(WorkflowDomain.CONTRACT, "계약 결재");
        createTwoStepWorkflow(WorkflowDomain.PURCHASE_CONTRACT, "매입 계약 결재");
        createTwoStepWorkflow(WorkflowDomain.FREE_MAINTENANCE_CONTRACT, "무상유지보수 계약 결재");
        createTwoStepWorkflow(WorkflowDomain.PAID_MAINTENANCE_CONTRACT, "유상유지보수 계약 결재");
        createTwoStepWorkflow(WorkflowDomain.PRB, "PRB 보고서 결재");
        createTwoStepWorkflow(WorkflowDomain.PRB_RESULT, "PRB 결과 보고서 결재");
        createTwoStepWorkflow(WorkflowDomain.BID_RESULT, "입찰 결과 결재");

        createThreeStepWorkflow(
                WorkflowDomain.LICENSE,
                "라이선스 결재",
                "라이선스 관리 담당자",
                Position.TEAM_MEMBER
        );

        createThreeStepWorkflow(
                WorkflowDomain.BILLING,
                "세금계산서 발행 요청 결재",
                "세금계산서 발행 담당자",
                Position.TEAM_MEMBER
        );

        createThreeStepWorkflow(
                WorkflowDomain.CUSTOMER_SUPPORT,
                "고객지원요청 결재",
                "고객지원 담당자",
                Position.TEAM_MEMBER
        );
    }

    private void createTwoStepWorkflow(
            WorkflowDomain domain,
            String templateName
    ) {
        if (workflowTemplateRepository.findByWorkflowDomainAndActiveTrue(domain).isPresent()) {
            return;
        }

        WorkflowTemplate template = WorkflowTemplate.create(domain, templateName);
        workflowTemplateRepository.save(template);

        workflowStepRepository.save(
                WorkflowStep.create(
                        template,
                        1,
                        "팀장 결재",
                        Position.TEAM_LEADER,
                        true
                )
        );

        workflowStepRepository.save(
                WorkflowStep.create(
                        template,
                        2,
                        "본부장 결재",
                        Position.HEAD_DIRECTOR,
                        true
                )
        );
    }

    private void createThreeStepWorkflow(
            WorkflowDomain domain,
            String templateName,
            String firstStepName,
            Position firstApproverPosition
    ) {
        if (workflowTemplateRepository.findByWorkflowDomainAndActiveTrue(domain).isPresent()) {
            return;
        }

        WorkflowTemplate template = WorkflowTemplate.create(domain, templateName);
        workflowTemplateRepository.save(template);

        workflowStepRepository.save(
                WorkflowStep.create(
                        template,
                        1,
                        firstStepName,
                        firstApproverPosition,
                        true
                )
        );

        workflowStepRepository.save(
                WorkflowStep.create(
                        template,
                        2,
                        "팀장 결재",
                        Position.TEAM_LEADER,
                        true
                )
        );

        workflowStepRepository.save(
                WorkflowStep.create(
                        template,
                        3,
                        "본부장 결재",
                        Position.HEAD_DIRECTOR,
                        true
                )
        );
    }
}
