package com.nkia.Orbis.domain.project.project.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ProjectCreateRequest {
    @NotNull(message = "수주보고서 ID는 필수입니다")
    private Long orderReportId;
}
