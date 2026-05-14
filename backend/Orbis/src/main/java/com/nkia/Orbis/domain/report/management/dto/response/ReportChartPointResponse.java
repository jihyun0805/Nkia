package com.nkia.Orbis.domain.report.management.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReportChartPointResponse {

    private String label;
    private Object value;
    private Map<String, Object> extra = new LinkedHashMap<>();
}
