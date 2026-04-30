package com.nkia.Orbis.domain.project.projectresultreport.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResultReportCreateRequest {

    @NotNull(message = "대상 사업 ID는 필수입니다.")
    private Long projectId;

    @NotNull(message = "PM 지정은 필수입니다.")
    private UUID managerId;

    @NotNull(message = "사업 개시일은 필수입니다.")
    private LocalDate startDate;

    @NotNull(message = "사업 완료일은 필수입니다.")
    private LocalDate endDate;

    private Long fileId;

    @AssertTrue(message = "완료일은 개시일 이후여야 합니다.")
    private boolean isValidDateRange() {
        if (startDate == null || endDate == null) return true; // @NotNull이 따로 잡음
        return !endDate.isBefore(startDate);
    }
}
