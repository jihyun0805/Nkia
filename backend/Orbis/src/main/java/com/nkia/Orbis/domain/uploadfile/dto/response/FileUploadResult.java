package com.nkia.Orbis.domain.uploadfile.dto.response;

public record FileUploadResult(
        String originalFileName,
        String objectKey,
        String contentType,
        Long fileSize
) {
}