package com.nkia.Orbis.domain.project.projectresultreport.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사업 결과보고 수정 요청 DTO
 */
@Getter
@NoArgsConstructor
@Schema(description = "사업 결과보고 수정 요청 DTO")
public class ProjectResultReportUpdateRequest {

    @NotNull(message = "PM 지정은 필수입니다.")
    private UUID managerId;

    @NotNull(message = "사업 개시일은 필수입니다.")
    private LocalDate startDate;

    @NotNull(message = "사업 완료일은 필수입니다.")
    private LocalDate endDate;

    private String content;

    private Long fileId;
}
