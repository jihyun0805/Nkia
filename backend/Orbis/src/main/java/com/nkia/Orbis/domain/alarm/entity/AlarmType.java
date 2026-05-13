package com.nkia.Orbis.domain.alarm.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum AlarmType {
    APPROVAL_REQUEST("결재 요청"),
    APPROVAL_REJECTED("결재 반려"),
    QUOTE_REVIEW("견적서 검토 요청"),
    DEADLINE_WARNING("마감 기한 알림"),
    MAINTENANCE_EXPIRY("유지보수 만료 알림"),
    ACTIVITY_REQUEST("활동 요청"),

    QUOTATION_APPROVAL_REQUEST("견적서 결재 요청"),
    MAINTENANCE_QUOTATION_APPROVAL_REQUEST("유지보수 견적서 결재 요청"),
    ORDER_REPORT_APPROVAL_REQUEST("수주보고서 결재 요청"),
    CONTRACT_APPROVAL_REQUEST("계약 결재 요청"),
    PURCHASE_CONTRACT_APPROVAL_REQUEST("매입계약 결재 요청"),
    FREE_MAINTENANCE_CONTRACT_APPROVAL_REQUEST("무상유지보수 계약 결재 요청"),
    PAID_MAINTENANCE_CONTRACT_APPROVAL_REQUEST("유상유지보수 계약 결재 요청"),
    LICENSE_APPROVAL_REQUEST("라이선스 발급 결재 요청"),
    BILLING_APPROVAL_REQUEST("세금계산서 발행 결재 요청"),
    CUSTOMER_SUPPORT_APPROVAL_REQUEST("고객지원요청 결재 요청"),

    QUOTATION_APPROVED("견적서 승인"),
    MAINTENANCE_QUOTATION_APPROVED("유지보수 견적서 승인"),
    ORDER_REPORT_APPROVED("수주보고서 승인"),
    CONTRACT_APPROVED("계약 승인"),
    PURCHASE_APPROVED("매입계약 승인"),
    FREE_MAINTENANCE_CONTRACT_APPROVED("무상유지보수 계약 승인"),
    PAID_MAINTENANCE_CONTRACT_APPROVED("유상유지보수 계약 승인"),
    LICENSE_APPROVED("라이선스 발급 승인"),
    BILLING_APPROVED("세금계산서 발행 승인"),
    CUSTOMER_SUPPORT_APPROVED("고객지원요청 승인"),

    QUOTATION_REJECTED("견적서 반려"),
    MAINTENANCE_QUOTATION_REJECTED("유지보수 견적서 반려"),
    ORDER_REPORT_REJECTED("수주보고서 반려"),
    CONTRACT_REJECTED("계약 반려"),
    PURCHASE_REJECTED("매입계약 반려"),
    FREE_MAINTENANCE_CONTRACT_REJECTED("무상유지보수 계약 반려"),
    PAID_MAINTENANCE_CONTRACT_REJECTED("유상유지보수 계약 반려"),
    LICENSE_REJECTED("라이선스 발급 반려"),
    BILLING_REJECTED("세금계산서 발행 반려"),
    CUSTOMER_SUPPORT_REJECTED("고객지원요청 반려");

    private final String description;
}