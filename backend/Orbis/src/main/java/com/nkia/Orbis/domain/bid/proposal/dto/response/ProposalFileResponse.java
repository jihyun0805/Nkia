package com.nkia.Orbis.domain.bid.proposal.dto.response;

import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;

public record ProposalFileResponse(
        Long fileId,
        String originalFileName,
        Long fileSize,
        String presignedUrl // 프론트엔드에서 바로 클릭/렌더링 할 수 있는 링크
) {
    public static ProposalFileResponse of(UploadFile file, String presignedUrl) {
        return new ProposalFileResponse(
                file.getId(),
                file.getOriginalFileName(),
                file.getFileSize(),
                presignedUrl
        );
    }
}