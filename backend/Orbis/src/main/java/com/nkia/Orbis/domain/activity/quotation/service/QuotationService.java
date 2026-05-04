package com.nkia.Orbis.domain.activity.quotation.service;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ActivityErrorCode;
import com.nkia.Orbis.common.exception.errorcode.ProductModuleErrorCode;
import com.nkia.Orbis.domain.activity.quotation.dto.request.LaborItemCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.request.QuotationCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.request.SolutionItemCreateRequest;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationListResponse;
import com.nkia.Orbis.domain.activity.quotation.dto.response.QuotationResponse;
import com.nkia.Orbis.domain.activity.quotation.entity.Quotation;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationLaborItem;
import com.nkia.Orbis.domain.activity.quotation.entity.QuotationSolutionItem;
import com.nkia.Orbis.domain.activity.quotation.repository.QuotationRepository;
import com.nkia.Orbis.domain.productmodule.entity.ProductModule;
import com.nkia.Orbis.domain.productmodule.repository.ProductModuleRepository;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
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
    // Todo: 사업기회 구현 후 연동 예정
    private final QuotationRepository quotationRepository;
    private final ProductModuleRepository productModuleRepository;

    @Transactional
    public QuotationResponse create(QuotationCreateRequest request) {
        ProjectOpportunity projectOpportunity = null;

        Quotation quotation = Quotation.create(
                generateQuotationCode(request.getQuotationDate()),
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
}

