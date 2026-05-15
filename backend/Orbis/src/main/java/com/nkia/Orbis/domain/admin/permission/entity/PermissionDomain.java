package com.nkia.Orbis.domain.admin.permission.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PermissionDomain {
    PROJECT_OPPORTUNITY("사업 기회"),
    COMPANY("고객사/협력사"),
    SALES_ACTIVITY("영업 활동"),
    SALES_ACTIVITY_REQUEST("영업 활동 요청"),
    QUOTATION("견적"),
    RFP_ANALYSE_RESULT("RFP 분석 결과"),
    PRB("PRB"),
    PRB_RESULT("PRB 결과"),
    BID_RESULT("입찰 결과"),
    ORDER_REPORT("수주보고"),
    CONTRACT("계약"),
    PURCHASE_CONTRACT("매입 계약"),
    LICENSE("라이선스"),
    PROJECT("사업"),
    PROJECT_RESULT("사업 결과"),
    BILLING("청구/수금"),
    ESTIMATED_REVENUE("예상매출"),
    MAINTENANCE("유지보수"),
    MAINTENANCE_QUOTATION("유지보수 견적"),
    CUSTOMER_SUPPORT("고객지원"),
    PRODUCT_MODULE("제품 모듈"),
    DEPARTMENT("부서"),
    WORKFLOW_TEMPLATE("결재 프로세스"),
    WORKFLOW("결재 상신"),
    PERMISSION("권한"),
    USER("사용자 계정");

    private final String description;
}
