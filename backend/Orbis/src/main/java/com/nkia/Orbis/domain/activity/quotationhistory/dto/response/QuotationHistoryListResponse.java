package com.nkia.Orbis.domain.activity.quotationhistory.dto.response;

import com.nkia.Orbis.domain.activity.quotationhistory.entity.QuotationHistory;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuotationHistoryListResponse {
    private Long id;

    private String quotationCode;

    private Integer version;

    private LocalDate quotationDate;

    public static QuotationHistoryListResponse from(QuotationHistory quotationHistory) {
        return QuotationHistoryListResponse.builder()
                .id(quotationHistory.getId())
                .version(quotationHistory.getVersion())
                .quotationCode(quotationHistory.getQuotationCode())
                .quotationDate(quotationHistory.getQuotationDate())
                .build();
    }
}
