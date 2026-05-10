package com.nkia.Orbis.common.exception.errorcode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum WorkflowErrorCode implements ErrorCode {

    ACTIVE_WORKFLOW_NOT_FOUND(HttpStatus.NOT_FOUND, "WORKFLOW_0001",
            "활성화된 워크플로우 템플릿이 없습니다."),
    WORKFLOW_STEP_NOT_FOUND(HttpStatus.NOT_FOUND, "WORKFLOW_0002",
            "워크플로우 단계가 없습니다."),
    WORKFLOW_NOT_FOUND(HttpStatus.NOT_FOUND, "WORKFLOW_0003",
            "워크플로우를 찾을 수 없습니다."),
    WORKFLOW_LINE_NOT_FOUND(HttpStatus.NOT_FOUND, "WORKFLOW_0004",
            "현재 결재 라인을 찾을 수 없습니다."),
    DUPLICATE_WORKFLOW(HttpStatus.BAD_REQUEST, "WORKFLOW_0005",
            "이미 진행 중인 워크플로우가 있습니다."),
    WORKFLOW_ROLE_NOT_FOUND(HttpStatus.BAD_REQUEST, "WORKFLOW_0006",
            "결재 역할이 없습니다."),
    WORKFLOW_APPROVER_NOT_FOUND(HttpStatus.NOT_FOUND, "WORKFLOW_0007",
            "해당 역할 사용자가 없습니다."),
    INVALID_WORKFLOW_APPROVER(HttpStatus.FORBIDDEN, "WORKFLOW_0008",
            "현재 결재자가 아닙니다."),
    INVALID_WORKFLOW_STATUS(HttpStatus.BAD_REQUEST, "WORKFLOW_0009",
            "결재 대기 상태가 아닙니다."),
    DUPLICATE_WORKFLOW_TEMPLATE(HttpStatus.BAD_REQUEST, "WORKFLOW_0010",
            "중복된 결재 프로세스 입니다.");


    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}