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
public class ReportTableResponse {

    private String title;
    private List<String> columns = new ArrayList<>();
    private List<List<Object>> rows = new ArrayList<>();
}
