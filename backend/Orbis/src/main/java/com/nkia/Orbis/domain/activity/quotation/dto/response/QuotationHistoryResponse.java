package com.nkia.Orbis.domain.activity.quotation.dto.response;

import com.nkia.Orbis.domain.activity.quotation.entity.QuotationHistory;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuotationHistoryResponse {
    private Long id;

    private String quotationCode;

    private Integer version;

    private LocalDate quotationDate;

    public static QuotationHistoryResponse from(QuotationHistory quotationHistory) {
        return QuotationHistoryResponse.builder()
                .id(quotationHistory.getId())
                .version(quotationHistory.getVersion())
                .quotationCode(quotationHistory.getQuotationCode())
                .quotationDate(quotationHistory.getQuotationDate())
                .build();
    }
}
