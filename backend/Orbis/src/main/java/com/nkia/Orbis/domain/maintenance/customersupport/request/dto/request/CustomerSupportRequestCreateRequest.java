package com.nkia.Orbis.domain.maintenance.customersupport.request.dto.request;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CustomerSupportRequestCreateRequest {
    private Long customerCompanyCode;
    private LocalDate requestStartDate;
    private LocalDate requestEndDate;
    private String requestContent;

    private UUID requesterId;
    private UUID registrantId;
    private UUID salesRepId;
    private UUID supportManagerId;

    private String remarks;

    // 공통 첨부파일 ID 리스트
    private List<Long> attachedFileIds = new ArrayList<>();
}
