package com.nkia.Orbis.domain.report.management.service;

import com.nkia.Orbis.domain.report.management.dto.request.ManagementReportRequest;
import com.nkia.Orbis.domain.report.management.dto.request.ReportVisualizationRequest;
import com.nkia.Orbis.domain.report.management.dto.response.ManagementReportResponse;
import com.nkia.Orbis.domain.report.management.dto.response.ReportChartPointResponse;
import com.nkia.Orbis.domain.report.management.dto.response.ReportChartResponse;
import com.nkia.Orbis.domain.report.management.dto.response.ReportMetricResponse;
import com.nkia.Orbis.domain.report.management.dto.response.ReportTableResponse;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class ManagementReportAggregationService {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public ManagementReportResponse buildAnalytics(ManagementReportRequest request) {
        ManagementReportResponse response = new ManagementReportResponse();
        attachAnalytics(response, request);
        return response;
    }

    public void attachAnalytics(ManagementReportResponse response, ManagementReportRequest request) {
        if (response == null) {
            return;
        }

        ReportVisualizationRequest visualization = request.getVisualization();
        boolean includeMetrics = visualization == null || visualization.isIncludeMetrics();
        boolean includeCharts = visualization == null || visualization.isIncludeCharts();
        boolean includeTables = visualization == null || visualization.isIncludeTables();

        ReportQueryParts queryParts = buildBaseQuery(request);

        if (includeMetrics) {
            response.setMetrics(buildMetrics(queryParts));
        }
        if (includeCharts) {
            response.setCharts(buildCharts(queryParts));
        }
        if (includeTables) {
            response.setTables(buildTables(queryParts));
        }
    }

    private List<ReportMetricResponse> buildMetrics(ReportQueryParts queryParts) {
        String effectiveStageSql = effectiveStageSql();
        String sql = """
                select
                  count(*) as total_count,
                  coalesce(sum(coalesce(po.expected_budget, 0)), 0) as total_budget,
                  count(*) filter (where %s in ('ACTIVITY', 'BID')) as active_bid_count,
                  count(*) filter (where %s in ('CONTRACT', 'PROJECT', 'MAINTENANCE', 'POST_SALES')) as won_projectized_count
                from project_opportunity po
                left join company c on c.id = po.customer_company_id and c.deleted = false
                %s
                """.formatted(effectiveStageSql, effectiveStageSql, queryParts.whereClause());

        Map<String, Object> row = jdbcTemplate.queryForMap(sql, queryParts.params());
        long totalCount = asLong(row.get("total_count"));
        BigDecimal totalBudget = asBigDecimal(row.get("total_budget"));
        long activeBidCount = asLong(row.get("active_bid_count"));
        long wonProjectizedCount = asLong(row.get("won_projectized_count"));

        List<ReportMetricResponse> metrics = new ArrayList<>();
        metrics.add(metric("Total opportunities", totalCount, "count", "Filtered opportunity count"));
        metrics.add(metric("Total expected budget", totalBudget, "KRW", "Sum of expected_budget"));
        metrics.add(metric("Active or bid stage count", activeBidCount, "count", "Opportunities in ACTIVITY or BID stage"));
        metrics.add(metric("Won or projectized count", wonProjectizedCount, "count", "Opportunities in CONTRACT, PROJECT, MAINTENANCE, or POST_SALES stage"));
        return metrics;
    }

    private List<ReportChartResponse> buildCharts(ReportQueryParts queryParts) {
        List<ReportChartResponse> charts = new ArrayList<>();
        charts.add(chart("bar", "Opportunities by stage", "label", "value", groupCount(queryParts, effectiveStageSql(), effectiveStageSql())));
        charts.add(chart("pie", "Customer sector mix", "label", "value", groupCount(queryParts, "coalesce(c.sector, 'UNKNOWN')", "coalesce(c.sector, 'UNKNOWN')")));
        charts.add(chart("bar", "Expected budget by business type", "label", "value", groupBudget(queryParts, businessTypeGroupSql(), businessTypeGroupSql())));
        return charts;
    }

    private List<ReportTableResponse> buildTables(ReportQueryParts queryParts) {
        return List.of(buildStageSummaryTable(queryParts), buildTopOpportunitiesTable(queryParts));
    }

    private ReportTableResponse buildStageSummaryTable(ReportQueryParts queryParts) {
        String effectiveStageSql = effectiveStageSql();
        String sql = """
                select
                  %s as stage,
                  count(*) as opportunity_count,
                  coalesce(sum(coalesce(po.expected_budget, 0)), 0) as expected_budget
                from project_opportunity po
                left join company c on c.id = po.customer_company_id and c.deleted = false
                %s
                group by %s
                order by opportunity_count desc, stage asc
                """.formatted(effectiveStageSql, queryParts.whereClause(), effectiveStageSql);

        List<List<Object>> rows = jdbcTemplate.query(
                sql,
                queryParts.params(),
                (rs, rowNum) -> List.of(
                        valueOrEmpty(rs.getString("stage")),
                        rs.getLong("opportunity_count"),
                        rs.getBigDecimal("expected_budget")
                )
        );

        ReportTableResponse table = new ReportTableResponse();
        table.setTitle("Stage portfolio summary");
        table.setColumns(List.of("Stage", "Count", "Expected Budget"));
        table.setRows(rows);
        return table;
    }

    private ReportTableResponse buildTopOpportunitiesTable(ReportQueryParts queryParts) {
        String effectiveStageSql = effectiveStageSql();
        String sql = """
                select
                  po.opportunity_code,
                  po.opportunity_name,
                  coalesce(c.name, '') as customer_name,
                  coalesce(c.sector, '') as sector,
                  %s as stage,
                  po.project_type,
                  po.expected_bid_date,
                  coalesce(po.expected_budget, 0) as expected_budget
                from project_opportunity po
                left join company c on c.id = po.customer_company_id and c.deleted = false
                %s
                order by coalesce(po.expected_budget, 0) desc, po.expected_bid_date desc nulls last
                limit 10
                """.formatted(effectiveStageSql, queryParts.whereClause());

        List<List<Object>> rows = jdbcTemplate.query(
                sql,
                queryParts.params(),
                (rs, rowNum) -> List.of(
                        valueOrEmpty(rs.getString("opportunity_code")),
                        valueOrEmpty(rs.getString("opportunity_name")),
                        valueOrEmpty(rs.getString("customer_name")),
                        valueOrEmpty(rs.getString("sector")),
                        valueOrEmpty(rs.getString("stage")),
                        valueOrEmpty(rs.getString("project_type")),
                        rs.getDate("expected_bid_date") == null ? "" : rs.getDate("expected_bid_date").toLocalDate().toString(),
                        rs.getBigDecimal("expected_budget")
                )
        );

        ReportTableResponse table = new ReportTableResponse();
        table.setTitle("Top opportunities by expected budget");
        table.setColumns(List.of("Code", "Opportunity", "Customer", "Sector", "Stage", "Business Type", "Expected Bid Date", "Expected Budget"));
        table.setRows(rows);
        return table;
    }

    private List<ReportChartPointResponse> groupCount(ReportQueryParts queryParts, String selectExpression, String groupExpression) {
        String sql = """
                select %s as label, count(*) as value
                from project_opportunity po
                left join company c on c.id = po.customer_company_id and c.deleted = false
                %s
                group by %s
                order by value desc, label asc
                """.formatted(selectExpression, queryParts.whereClause(), groupExpression);

        return jdbcTemplate.query(
                sql,
                queryParts.params(),
                (rs, rowNum) -> point(valueOrEmpty(rs.getString("label")), rs.getLong("value"))
        );
    }

    private List<ReportChartPointResponse> groupBudget(ReportQueryParts queryParts, String selectExpression, String groupExpression) {
        String sql = """
                select %s as label, coalesce(sum(coalesce(po.expected_budget, 0)), 0) as value
                from project_opportunity po
                left join company c on c.id = po.customer_company_id and c.deleted = false
                %s
                group by %s
                order by value desc, label asc
                """.formatted(selectExpression, queryParts.whereClause(), groupExpression);

        return jdbcTemplate.query(
                sql,
                queryParts.params(),
                (rs, rowNum) -> point(valueOrEmpty(rs.getString("label")), rs.getBigDecimal("value"))
        );
    }

    private ReportQueryParts buildBaseQuery(ManagementReportRequest request) {
        List<String> conditions = new ArrayList<>();
        MapSqlParameterSource params = new MapSqlParameterSource();

        conditions.add("po.deleted = false");

        LocalDate startDate = parseDate(request.getStartAt());
        if (startDate != null) {
            conditions.add("po.expected_bid_date >= :startDate");
            params.addValue("startDate", Date.valueOf(startDate));
        }

        LocalDate endDate = parseDate(request.getEndAt());
        if (endDate != null) {
            conditions.add("po.expected_bid_date <= :endDate");
            params.addValue("endDate", Date.valueOf(endDate));
        }

        if (StringUtils.hasText(request.getCustomerGroup()) && !"ALL".equalsIgnoreCase(request.getCustomerGroup())) {
            conditions.add("c.sector = :customerGroup");
            params.addValue("customerGroup", request.getCustomerGroup());
        }

        List<String> effectiveBusinessTypes = filterAllValues(request.getBusinessTypes());
        if (!CollectionUtils.isEmpty(effectiveBusinessTypes)) {
            conditions.add("po.project_type in (:businessTypes)");
            params.addValue("businessTypes", effectiveBusinessTypes);
        }

        List<String> effectiveStatuses = filterAllValues(request.getStatuses());
        if (!CollectionUtils.isEmpty(effectiveStatuses)) {
            conditions.add(effectiveStageSql() + " in (:statuses)");
            params.addValue("statuses", effectiveStatuses);
        }

        return new ReportQueryParts("where " + String.join(" and ", conditions), params);
    }

    private String effectiveStageSql() {
        return """
                case
                  when exists (
                    select 1
                    from customer_support cs
                    join maintenance m on m.id = cs.maintenance_id and m.deleted = false
                    join project p on p.id = m.project_id and p.deleted = false
                    join order_report orr on orr.id = p.order_report_id and orr.deleted = false
                    where cs.deleted = false
                      and orr.project_opportunity_id = po.id
                  ) then 'POST_SALES'
                  when exists (
                    select 1
                    from maintenance m
                    join project p on p.id = m.project_id and p.deleted = false
                    join order_report orr on orr.id = p.order_report_id and orr.deleted = false
                    where m.deleted = false
                      and orr.project_opportunity_id = po.id
                  ) then 'MAINTENANCE'
                  when exists (
                    select 1
                    from project p
                    join order_report orr on orr.id = p.order_report_id and orr.deleted = false
                    where p.deleted = false
                      and orr.project_opportunity_id = po.id
                  ) then 'PROJECT'
                  when exists (
                    select 1
                    from order_report orr
                    where orr.deleted = false
                      and orr.project_opportunity_id = po.id
                  ) then 'CONTRACT'
                  when exists (
                    select 1
                    from prb prb
                    where prb.deleted = false
                      and prb.project_opportunity_id = po.id
                  ) or exists (
                    select 1
                    from proposal pp
                    where pp.deleted = false
                      and pp.project_opportunity_id = po.id
                  ) or exists (
                    select 1
                    from quotation q
                    where q.deleted = false
                      and q.project_opportunity_id = po.id
                  ) then 'BID'
                  when exists (
                    select 1
                    from sales_activity sa
                    where sa.deleted = false
                      and sa.project_opportunity_id = po.id
                  ) then 'ACTIVITY'
                  else po.stage
                end
                """;
    }

    private List<String> filterAllValues(List<String> values) {
        if (CollectionUtils.isEmpty(values)) {
            return List.of();
        }
        return values.stream()
                .filter(StringUtils::hasText)
                .filter(value -> !"ALL".equalsIgnoreCase(value))
                .toList();
    }

    private String businessTypeGroupSql() {
        return """
                case
                  when po.project_type = 'ITSM' then 'ITSM'
                  when po.project_type = 'DASHBOARD' then 'DASHBOARD'
                  when po.project_type in ('DATACENTER', 'RCA', 'DCA') then 'AIOTION'
                  when po.project_type = 'ITAM' then 'ITO'
                  when po.project_type in ('SUPPORTING_TOOLS', 'CLOUD', 'BSM', 'E2E', 'ETC') then 'ETC'
                  else coalesce(po.project_type, 'UNKNOWN')
                end
                """;
    }

    private ReportMetricResponse metric(String label, Object value, String unit, String description) {
        ReportMetricResponse metric = new ReportMetricResponse();
        metric.setLabel(label);
        metric.setValue(value);
        metric.setUnit(unit);
        metric.setDescription(description);
        return metric;
    }

    private ReportChartResponse chart(String type, String title, String xKey, String yKey, List<ReportChartPointResponse> data) {
        ReportChartResponse chart = new ReportChartResponse();
        chart.setType(type);
        chart.setTitle(title);
        chart.setXKey(xKey);
        chart.setYKey(yKey);
        chart.setData(data);
        return chart;
    }

    private ReportChartPointResponse point(String label, Object value) {
        ReportChartPointResponse point = new ReportChartPointResponse();
        point.setLabel(label);
        point.setValue(value);
        point.setExtra(new HashMap<>());
        return point;
    }

    private LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String datePart = value.length() >= 10 ? value.substring(0, 10) : value;
        return LocalDate.parse(datePart);
    }

    private long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return 0L;
    }

    private BigDecimal asBigDecimal(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return BigDecimal.ZERO;
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private record ReportQueryParts(String whereClause, MapSqlParameterSource params) {
    }
}
