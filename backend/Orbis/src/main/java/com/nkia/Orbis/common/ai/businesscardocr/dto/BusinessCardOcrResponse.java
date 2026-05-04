package com.nkia.Orbis.common.ai.businesscardocr.dto;

public record BusinessCardOcrResponse(
        String companyName,
        String contactName,
        String department,
        String role,
        String position,
        String address,
        String email,
        String mobile,
        String phone,
        String fax,
        String rawText
) {
}
