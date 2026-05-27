package com.nkia.Orbis.domain.project.projectresultreport.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResultReportCreateRequest {

    @NotNull(message = "대상 사업 ID는 필수입니다.")
    private Long projectId;

    private Long fileId;
}
