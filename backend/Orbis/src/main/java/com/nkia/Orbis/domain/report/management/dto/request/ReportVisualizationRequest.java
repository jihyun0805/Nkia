package com.nkia.Orbis.domain.report.management.dto.request;

import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReportVisualizationRequest {

    private boolean includeMetrics = true;
    private boolean includeCharts = true;
    private boolean includeTables = true;
    private List<String> chartTypes = new ArrayList<>();
}
