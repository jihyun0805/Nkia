package com.nkia.Orbis.domain.activity.quotation.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ActivityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.common.util.SecurityUtil;
import com.nkia.Orbis.domain.activity.quotation.dto.request.LaborItemCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.request.QuotationCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.request.SolutionItemCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationListResponse;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationResponse;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItem;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import com.nkia.Orbis.domain.activity.quotation.repository.QuotationRepository;
import com.nkia.Orbis.domain.activity.quotationhistory.dto.response.QuotationHistoryListResponse;
import com.nkia.Orbis.domain.activity.quotationhistory.dto.response.QuotationHistoryResponse;
import com.nkia.Orbis.domain.activity.quotationhistory.entity.QuotationHistory;
import com.nkia.Orbis.domain.activity.quotationhistory.entity.QuotationLaborItemHistory;
import com.nkia.Orbis.domain.activity.quotationhistory.entity.QuotationSolutionItemHistory;
import com.nkia.Orbis.domain.activity.quotationhistory.repository.QuotationHistoryRepository;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.admin.workflow.entity.Workflow;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;
import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowStatus;
import com.nkia.Orbis.domain.admin.workflow.repository.WorkflowRepository;
import com.nkia.Orbis.domain.admin.workflow.service.WorkflowService;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class QuotationService {
    private final QuotationRepository quotationRepository;
    private final ProductModuleRepository productModuleRepository;
    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final QuotationHistoryRepository quotationHistoryRepository;
    private final WorkflowService workflowService;
    private final WorkflowRepository workflowRepository;

    @Transactional
    public QuotationResponse create(QuotationCreateRequest request) {

        ProjectOpportunity projectOpportunity = projectOpportunityRepository.findById(request.getProjectOpportunityId())
                .orElseThrow(() -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));

        Quotation quotation = Quotation.create(
                generateQuotationCode(request.getQuotationDate()),
                request.getRefNo(),
                projectOpportunity,
                request.getQuotationDate(),
                request.getPaymentCondition(),
                request.getNote()
        );

        addSolutionItems(quotation, request.getQuotationSolutionItems());
        addLaborItems(quotation, request.getQuotationLaborItems());

        quotation.calculateTotalAmount();

        Quotation saved = quotationRepository.save(quotation);

        return QuotationResponse.from(saved, getWorkflowId(saved.getId()));
    }

    private void addSolutionItems(
            Quotation quotation,
            List<SolutionItemCreateRequest> solutionItemRequests
    ) {
        if (solutionItemRequests == null || solutionItemRequests.isEmpty()) {
            return;
        }

        for (SolutionItemCreateRequest request : solutionItemRequests) {

            ProductModule productModule = productModuleRepository.findById(request.getProductModuleId())
                    .orElseThrow(() -> new ApiException(ProductModuleErrorCode.PRODUCT_MODULE_NOT_FOUND));

            QuotationSolutionItem item = QuotationSolutionItem.create(
                    productModule,
                    request.getQuantity(),
                    request.getSupplyPrice(),
                    request.getDiscountRate(),
                    request.getFreeSupply()
            );

            quotation.addSolutionItem(item);
        }
    }

    private void addLaborItems(
            Quotation quotation,
            List<LaborItemCreateRequest> laborItemRequests
    ) {
        if (laborItemRequests == null || laborItemRequests.isEmpty()) {
            return;
        }

        for (LaborItemCreateRequest request : laborItemRequests) {
            QuotationLaborItem item = QuotationLaborItem.create(
                    request.getLaborType(),
                    request.getUnitPrice(),
                    request.getManMonth(),
                    request.getSupplyPrice()
            );

            quotation.addLaborItem(item);
        }
    }

    private String generateQuotationCode(LocalDate quotationDate) {

        String datePart = quotationDate.format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = "QT-" + datePart + "-";

        Optional<String> lastCode =
                quotationRepository.findLastQuotationCodeIncludingDeleted(prefix);

        int nextNumber = lastCode
                .map(code -> {
                    String numberPart = code.substring(code.lastIndexOf("-") + 1);
                    return Integer.parseInt(numberPart) + 1;
                })
                .orElse(1);

        return prefix + String.format("%04d", nextNumber);
    }

    @Transactional
    public void delete(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        quotation.delete();
    }

    @Transactional
    public List<QuotationListResponse> getQuotations() {
        return quotationRepository.findAll()
                .stream()
                .map(QuotationListResponse::from)
                .toList();
    }

    @Transactional
    public QuotationResponse getQuotation(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        return QuotationResponse.from(quotation, getWorkflowId(quotation.getId()));
    }

    @Transactional
    public QuotationResponse update(Long quotationId, QuotationCreateRequest request) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        // 1. 수정 전 견적서 스냅샷 저장
        saveSnapshot(quotation);

        // 2. 수정할 사업기회 조회
        ProjectOpportunity projectOpportunity = projectOpportunityRepository.findById(request.getProjectOpportunityId())
                .orElseThrow(() -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));

        // 3. 기존 견적서 자체 수정
        quotation.update(
                request.getRefNo(),
                projectOpportunity,
                request.getQuotationDate(),
                request.getPaymentCondition(),
                request.getNote()
        );

        // 4. 기존 품목 제거 후 새 품목 추가
        quotation.clearItems();

        addSolutionItems(quotation, request.getQuotationSolutionItems());
        addLaborItems(quotation, request.getQuotationLaborItems());

        quotation.calculateTotalAmount();

        return QuotationResponse.from(quotation, getWorkflowId(quotation.getId()));
    }

    private Integer calculateNextHistoryVersion(String quotationCode) {
        return (int) quotationHistoryRepository.countByQuotationCode(quotationCode) + 1;
    }

    @Transactional
    public List<QuotationHistoryListResponse> getQuotationHistories(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        List<QuotationHistory> histories =
                quotationHistoryRepository.findByQuotationCodeOrderByVersionDesc(
                        quotation.getQuotationCode()
                );

        if (histories.isEmpty()) {
            throw new ApiException(ActivityErrorCode.QUOTATION_HISTORY_NOT_FOUND);
        }

        return histories.stream()
                .map(QuotationHistoryListResponse::from)
                .toList();
    }

    @Transactional
    public QuotationHistoryResponse getQuotationHistory(Long historyId) {
        QuotationHistory history = quotationHistoryRepository.findById(historyId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_HISTORY_NOT_FOUND));

        return QuotationHistoryResponse.from(history);
    }

    private void saveSnapshot(Quotation quotation) {
        Integer nextVersion = calculateNextHistoryVersion(quotation.getQuotationCode());

        QuotationHistory history = QuotationHistory.create(quotation, nextVersion);

        for (QuotationSolutionItem item : quotation.getQuotationSolutionItems()) {
            history.addSolutionItem(
                    QuotationSolutionItemHistory.create(item)
            );
        }

        for (QuotationLaborItem item : quotation.getQuotationLaborItems()) {
            history.addLaborItem(
                    QuotationLaborItemHistory.create(item)
            );
        }

        quotationHistoryRepository.save(history);
    }

    @Transactional
    public void submitQuotation(
            Long quotationId,
            UUID firstApproverId
    ) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        if (!quotation.isDraft()) {
            throw new ApiException(ActivityErrorCode.INVALID_QUOTATION_STATUS);
        }

        UUID requesterId = UUID.fromString(SecurityUtil.getCurrentUserId());

        Workflow workflow = workflowService.startWorkflow(
                WorkflowDomain.QUOTATION,
                quotation.getId(),
                requesterId,
                firstApproverId
        );

        quotation.submit();
    }

    private Long getWorkflowId(Long quotationId) {

        return workflowRepository
                .findByWorkflowDomainAndTargetIdAndStatus(
                        WorkflowDomain.QUOTATION,
                        quotationId,
                        WorkflowStatus.IN_PROGRESS
                )
                .map(Workflow::getId)
                .orElse(null);
    }
}

