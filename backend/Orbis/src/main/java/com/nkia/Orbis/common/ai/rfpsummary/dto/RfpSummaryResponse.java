package com.nkia.Orbis.common.ai.rfpsummary.dto;

public record RfpSummaryResponse(
        String fileName,
        String extension,
        String fileType,
        int extractedTextChars,
        String extractedText,
        String summary
) {
}
