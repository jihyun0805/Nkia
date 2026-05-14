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
public class ReportChartResponse {

    private String type;
    private String title;
    private String xKey;
    private String yKey;
    private List<ReportChartPointResponse> data = new ArrayList<>();
}
