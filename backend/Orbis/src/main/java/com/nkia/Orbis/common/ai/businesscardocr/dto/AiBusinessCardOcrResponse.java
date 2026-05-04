package com.nkia.Orbis.common.ai.businesscardocr.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiBusinessCardOcrResponse(
        @JsonProperty("company_name")
        String companyName,
        @JsonProperty("contact_name")
        String contactName,
        String department,
        String role,
        String position,
        String address,
        String email,
        String mobile,
        String phone,
        String fax,
        @JsonProperty("raw_text")
        String rawText
) {
    public BusinessCardOcrResponse toResponse() {
        return new BusinessCardOcrResponse(
                companyName,
                contactName,
                department,
                role,
                position,
                address,
                email,
                mobile,
                phone,
                fax,
                rawText
        );
    }
}
