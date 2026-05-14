package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ProposalErrorCode implements ErrorCode {
    PROPOSAL_NOT_FOUND(HttpStatus.NOT_FOUND, "PROPOSAL_0001", "존재하지 않는 제안서 ID입니다."),
    PROPOSAL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "PROPOSAL_0002", "사업 기회에 이미 제안서가 존재합니다."),
    FILES_REQUIRED_FOR_COMPLETION(HttpStatus.BAD_REQUEST, "PROPOSAL_0003", "제안서를 제출하려면 최소 1개 이상의 첨부파일이 필요합니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
