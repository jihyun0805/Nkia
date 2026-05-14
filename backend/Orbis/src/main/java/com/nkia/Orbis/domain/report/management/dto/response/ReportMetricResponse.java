package com.nkia.Orbis.domain.report.management.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReportMetricResponse {

    private String label;
    private Object value;
    private String unit;
    private String description;
}
