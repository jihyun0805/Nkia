package com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CustomerSupportRequestUpdateRequest {
    private LocalDate requestStartDate;
    private LocalDate requestEndDate;
    private String requestContent;
    private UUID requesterId;
    private UUID supportManagerId;
    private String remarks;
    private List<Long> attachedFileIds;
}
