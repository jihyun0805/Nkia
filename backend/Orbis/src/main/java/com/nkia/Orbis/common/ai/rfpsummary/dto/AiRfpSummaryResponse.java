package com.nkia.Orbis.common.ai.rfpsummary.dto;

public record AiRfpSummaryResponse(
        String fileName,
        String extension,
        String fileType,
        int extractedTextChars,
        String extractedText,
        String summary
) {
    public RfpSummaryResponse toResponse() {
        return new RfpSummaryResponse(
                fileName,
                extension,
                fileType,
                extractedTextChars,
                extractedText,
                summary
        );
    }
}
