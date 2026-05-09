package com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response;

import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportRequestListResponse {
    private Long id;

    private String customerName;

    private LocalDate requestStartDate;

    private LocalDate requestEndDate;

    private String requesterName;

    private String salesRepName;

    private String supportManagerName;

    public static CustomerSupportRequestListResponse from(CustomerSupportRequest request) {
        return CustomerSupportRequestListResponse.builder()
                .id(request.getId())
                .customerName(request.getCustomerCompany().getName())
                .requestStartDate(request.getRequestStartDate())
                .requestEndDate(request.getRequestEndDate())
                .requesterName(request.getRequester().getName())
                .salesRepName(request.getSalesRep().getName())
                .supportManagerName(request.getSupportManager() != null ?
                        request.getSupportManager().getName() : null)
                .build();
    }
}