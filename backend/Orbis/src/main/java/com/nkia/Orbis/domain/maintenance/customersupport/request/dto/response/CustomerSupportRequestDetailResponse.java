package com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response;

import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportRequestDetailResponse {
    private Long id;
    private Long customerCompanyCode;
    private LocalDate requestStartDate;
    private LocalDate requestEndDate;
    private String requestContent;
    private String requesterName;
    private String supportManagerName;
    private String remarks;
    private String approvalStatus;
    private List<Long> attachedFileIds;

    public static CustomerSupportRequestDetailResponse from(CustomerSupportRequest request) {
        return CustomerSupportRequestDetailResponse.builder()
                .id(request.getId())
                .customerCompanyCode(request.getCustomerCompanyCode())
                .requestStartDate(request.getRequestStartDate())
                .requestEndDate(request.getRequestEndDate())
                .requestContent(request.getRequestContent())
                .requesterName(request.getRequester().getName())
                .supportManagerName(request.getSupportManager() != null ? request.getSupportManager().getName() : null)
                .remarks(request.getRemarks())
                .approvalStatus(request.getApprovalStatus().name())
                .attachedFileIds(request.getAttachedFiles().stream().map(f -> f.getId()).toList())
                .build();
    }
}
