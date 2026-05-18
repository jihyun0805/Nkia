package com.nkia.Orbis.domain.projectopportunity.projectopportunity.dto.response;

import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;

public record FileInfoDto(
        Long id,
        String originalFileName
) {
    public static FileInfoDto from(UploadFile file) {
        return new FileInfoDto(file.getId(), file.getOriginalFileName());
    }
}
