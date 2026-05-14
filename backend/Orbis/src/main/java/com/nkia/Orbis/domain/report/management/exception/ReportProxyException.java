package com.nkia.Orbis.domain.report.management.exception;

import com.nkia.Orbis.common.exception.errorcode.ErrorCode;
import lombok.Getter;

@Getter
public class ReportProxyException extends RuntimeException {

    private final ErrorCode errorCode;

    public ReportProxyException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
