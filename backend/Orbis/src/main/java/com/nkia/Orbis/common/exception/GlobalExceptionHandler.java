package com.nkia.Orbis.common.exception;

import com.nkia.Orbis.common.exception.errorcode.CommonErrorCode;
import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.chatbot.proxy.exception.ChatbotProxyException;
import com.nkia.Orbis.domain.report.management.exception.ReportProxyException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException e) {
        log.warn("ApiException: {}", e.getErrorCode().getMessage());
        return ResponseEntity
                .status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.fail(e.getErrorCode()));
    }

    @ExceptionHandler(ChatbotProxyException.class)
    public ResponseEntity<ApiResponse<Void>> handleChatbotProxyException(ChatbotProxyException e) {
        log.warn("ChatbotProxyException: {}", e.getMessage());
        return ResponseEntity
                .status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.fail(e.getErrorCode(), e.getMessage()));
    }

    @ExceptionHandler(ReportProxyException.class)
    public ResponseEntity<ApiResponse<Void>> handleReportProxyException(ReportProxyException e) {
        log.warn("ReportProxyException: {}", e.getMessage());
        return ResponseEntity
                .status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.fail(e.getErrorCode(), e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("Unhandled Exception: ", e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail(CommonErrorCode.INTERNAL_SERVER_ERROR));
    }
}
