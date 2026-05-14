package com.nkia.Orbis.domain.report.management.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ManagementReportRequest {

    @NotBlank
    private String query;
    private String title;
    private String reportType = "management";

    @Min(3)
    @Max(20)
    private Integer limit = 10;

    private String startAt;
    private String endAt;
    private String customerGroup;
    private List<String> businessTypes = new ArrayList<>();
    private List<String> statuses = new ArrayList<>();
    private List<String> sourceTypes = new ArrayList<>();
    private List<String> sections = new ArrayList<>();
    private String audience = "executive";
    private String attachmentSessionId;

    @Valid
    private ReportVisualizationRequest visualization = new ReportVisualizationRequest();
}
