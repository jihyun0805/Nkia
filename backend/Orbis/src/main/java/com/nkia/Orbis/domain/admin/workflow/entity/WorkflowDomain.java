package com.nkia.Orbis.domain.admin.workflow.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum WorkflowDomain {
    QUOTATION("견적"),
    MAINTENANCE_QUOTATION("유지보수 견적"),
    ORDER_REPORT("수주보고"),
    CONTRACT("계약"),
    PURCHASE_CONTRACT("매입 계약"),
    FREE_MAINTENANCE_CONTRACT("무상 유지보수 계약"),
    PAID_MAINTENANCE_CONTRACT("유상 유지보수 계약"),
    LICENSE("라이선스"),
    BILLING("청구 및 수금"),
    CUSTOMER_SUPPORT("고객지원"),
    PRB("PRB"),
    PRB_RESULT("PRB 결과"),
    BID_RESULT("입찰 결과");

    private final String description;
}
