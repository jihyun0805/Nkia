package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ContractErrorCode;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderReportHandler implements WorkflowDomainHandler {

    private final OrderReportRepository orderReportRepository;
    private final ProjectService projectService;

    @Override
    public WorkflowDomain getDomain() {
        return WorkflowDomain.ORDER_REPORT;
    }

    @Override
    public void onApproved(Long targetId) {

        OrderReport orderReport = orderReportRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(
                        ContractErrorCode.ORDER_REPORT_NOT_FOUND
                ));

        orderReport.approve();
        
        // 수주보고서 승인 시 프로젝트 자동 등록
        projectService.createProjectFromOrderReport(orderReport);
    }

    @Override
    public void onRejected(Long targetId) {

        OrderReport orderReport = orderReportRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(
                        ContractErrorCode.ORDER_REPORT_NOT_FOUND
                ));

        orderReport.reject();
    }

    @Override
    public void onCancelled(Long targetId) {

        OrderReport orderReport = orderReportRepository.findById(targetId)
                .orElseThrow(() -> new ApiException(
                        ContractErrorCode.ORDER_REPORT_NOT_FOUND
                ));

        orderReport.cancel();
    }
}
