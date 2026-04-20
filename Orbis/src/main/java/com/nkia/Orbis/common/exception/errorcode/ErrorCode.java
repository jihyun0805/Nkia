package com.nkia.Orbis.common.exception.errorcode;

import org.springframework.http.HttpStatus;

public interface ErrorCode {
    String name();

    HttpStatus getHttpStatus();

    String getCode();

    String getMessage();
}
