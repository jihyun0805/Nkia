package com.nkia.Orbis.domain.maintenance.customersupport.request.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.maintenance.customersupport.request.entity.CustomerSupportRequest;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerSupportRequestDetailResponse {
    private Long id;
    private Long workflowId;
    private ApprovalStatus status;
    private String customerName;
    private LocalDate requestStartDate;
    private LocalDate requestEndDate;
    private String requestContent;
    private String requesterName;
    private String supportManagerName;
    private String registrantName;
    private String salesRepName;
    private String remarks;
    private List<Long> attachedFileIds;

    public static CustomerSupportRequestDetailResponse from(CustomerSupportRequest request, Long workflowId) {
        return CustomerSupportRequestDetailResponse.builder()
                .id(request.getId())
                .status(request.getStatus())
                .workflowId(workflowId)
                .customerName(request.getCustomerCompany() != null ? request.getCustomerCompany().getName() : "-")
                .requestStartDate(request.getRequestStartDate())
                .requestEndDate(request.getRequestEndDate())
                .requestContent(request.getRequestContent())
                .requesterName(request.getRequester() != null ? request.getRequester().getName() : "-")
                .supportManagerName(request.getSupportManager() != null ?
                        request.getSupportManager().getName() : "-")
                .registrantName(request.getRegistrant() != null ? request.getRegistrant().getName() : "-")
                .salesRepName(request.getSalesRep() != null ? request.getSalesRep().getName() : "-")
                .remarks(request.getRemarks())
                .attachedFileIds(request.getAttachedFiles().stream().map(f -> f.getId()).toList())
                .build();
    }
}
