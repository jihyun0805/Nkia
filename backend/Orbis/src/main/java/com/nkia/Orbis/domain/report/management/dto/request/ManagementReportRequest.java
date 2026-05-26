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

    // 리포트 생성의 핵심 질의이며 비어 있으면 AI 검색 기준을 만들 수 없다.
    @NotBlank
    private String query;
    private String title;
    // AI 서버의 reportType과 맞춘 기본 리포트 유형이다.
    private String reportType = "management";

    // 검색 근거 수는 너무 적거나 많지 않도록 AI API 계약과 동일한 범위로 제한한다.
    @Min(3)
    @Max(20)
    private Integer limit = 10;

    // 아래 필드들은 AI 서비스에 전달되어 검색/리포트 생성 조건으로 사용된다.
    private String startAt;
    private String endAt;
    private String customerGroup;
    private List<String> businessTypes = new ArrayList<>();
    private List<String> statuses = new ArrayList<>();
    private List<String> sourceTypes = new ArrayList<>();
    private List<String> sections = new ArrayList<>();
    private String audience = "executive";
    private String attachmentSessionId;

    // 차트/표 같은 화면 집계 정보를 포함해 AI 리포트 본문 생성에 참고시킨다.
    @Valid
    private ReportVisualizationRequest visualization = new ReportVisualizationRequest();
}
