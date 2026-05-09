package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum RfpAnalyzeErrorCode implements ErrorCode {
  RFP_ANALYZE_NOT_FOUND(HttpStatus.NOT_FOUND, "RFP_ANALYZE_0001", "존재하지 않는 RFP 분석 결과 입니다.");
  private final HttpStatus httpStatus;
  private final String code;
  private final String message;
}
