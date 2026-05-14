package com.nkia.Orbis.domain.report.management.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ManagementReportResponse {

    private String query;
    private String title;
    private String reportType;
    private String reportStatus;
    private String report;
    private String embeddingModel;
    private String chatModel;
    private Double retrievalConfidence;
    private String confidenceBand;
    private List<String> confidenceReasons = new ArrayList<>();
    private List<String> sourceTypes = new ArrayList<>();
    private List<ReportMetricResponse> metrics = new ArrayList<>();
    private List<ReportChartResponse> charts = new ArrayList<>();
    private List<ReportTableResponse> tables = new ArrayList<>();
    private List<ReportEvidenceResponse> evidences = new ArrayList<>();
    private String degradedReason;
}
