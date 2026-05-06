package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum UploadFileErrorCode implements ErrorCode {
    FILE_UPLOAD_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_0001", "파일 업로드 중 오류 발생."),
    FILE_REMOVE_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_0002", "파일 삭제 중 오류 발행."),
    FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "FILE_0003", "존재하지 않는 File Id 입니다."),
    FILE_URL_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_0004", "파일 URL 생성 중 오류 발생.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}