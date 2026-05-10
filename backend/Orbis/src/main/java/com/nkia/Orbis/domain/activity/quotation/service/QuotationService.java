package com.nkia.Orbis.domain.activity.quotation.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ActivityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProjectOpportunityErrorCode;
import com.nkia.Orbis.domain.activity.quotation.dto.request.LaborItemCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.request.QuotationCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.request.SolutionItemCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationListResponse;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationResponse;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationHistory;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItem;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItemHistory;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItemHistory;
import com.nkia.Orbis.domain.activity.quotation.repository.QuotationHistoryRepository;
import com.nkia.Orbis.domain.activity.quotation.repository.QuotationRepository;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.admin.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.repository.ProjectOpportunityRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
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

        return QuotationResponse.from(saved);
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

        return QuotationResponse.from(quotation);
    }

    @Transactional
    public QuotationResponse update(Long quotationId, QuotationCreateRequest request) {
        Quotation oldQuotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ApiException(ActivityErrorCode.QUOTATION_NOT_FOUND));

        // 1. 기존 견적서 히스토리 저장
        QuotationHistory history = QuotationHistory.create(oldQuotation);

        for (QuotationSolutionItem item : oldQuotation.getQuotationSolutionItems()) {
            history.addSolutionItem(
                    QuotationSolutionItemHistory.create(
                            item.getProductModule(),
                            item.getQuantity(),
                            item.getSupplyPrice(),
                            item.getDiscountRate(),
                            item.getFreeSupply()
                    )
            );
        }

        for (QuotationLaborItem item : oldQuotation.getQuotationLaborItems()) {
            history.addLaborItem(
                    QuotationLaborItemHistory.create(
                            item.getLaborType(),
                            item.getUnitPrice(),
                            item.getManMonth(),
                            item.getSupplyPrice()
                    )
            );
        }

        quotationHistoryRepository.save(history);

        // 2. 기존 견적서 삭제
        quotationRepository.delete(oldQuotation);

        // flush: DELETE 먼저 DB에 확정(DB에 같은 유니크 코드 충돌 방지)
        quotationRepository.flush();

        // 3. 새 요청값으로 새 견적서 생성
        ProjectOpportunity projectOpportunity = projectOpportunityRepository.findById(request.getProjectOpportunityId())
                .orElseThrow(() -> new ApiException(ProjectOpportunityErrorCode.PROJECT_OPPORTUNITY_NOT_FOUND));

        Quotation newQuotation = Quotation.create(
                oldQuotation.getQuotationCode(),
                request.getRefNo(),
                projectOpportunity,
                request.getQuotationDate(),
                request.getPaymentCondition(),
                request.getNote()
        );

        addSolutionItems(newQuotation, request.getQuotationSolutionItems());
        addLaborItems(newQuotation, request.getQuotationLaborItems());

        newQuotation.calculateTotalAmount();

        Quotation saved = quotationRepository.save(newQuotation);

        return QuotationResponse.from(saved);

    }
}

