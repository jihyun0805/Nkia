package com.nkia.Orbis.domain.project.estimatedrevenue.service;

import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.repository.OrderReportRepository;
import com.nkia.Orbis.domain.project.estimatedrevenue.dto.response.EstimatedRevenueResponse;
import com.nkia.Orbis.domain.project.estimatedrevenue.enums.ProductCategory;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사업의 제품별 월간 예상 매출액을 계산하는 서비스 클래스
 */
@Service
@RequiredArgsConstructor
public class ProjectRevenueService {

    private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
    private final OrderReportRepository orderReportRepository;
    /**
     * 올해 진행되는 전체 수주보고서의 제품군별/월별 매출 합계를 계산합니다.
     * @param reports 기준 연도에 해당하는 수주보고서 리스트
     * @param targetYear 기준 연도 (예: 2026)
     * @return 제품군별 통합 월간 매출 배분 목록
     */
    public List<EstimatedRevenueResponse> calculateTotalRevenue(List<OrderReport> reports, int targetYear) {
        List<EstimatedRevenueResponse> results = new ArrayList<>();

        for (ProductCategory category : ProductCategory.values()) {
            Map<String, Long> aggregateMap = new TreeMap<>(); // 월별 정렬을 위한 TreeMap
            long categoryTotal = 0;

            for (OrderReport report : reports) {
                categoryTotal += processReportProration(report, category, aggregateMap, targetYear);
            }

            results.add(EstimatedRevenueResponse.of(category, aggregateMap, categoryTotal));
        }
        return results;
    }

    private long processReportProration(OrderReport report, ProductCategory cat, Map<String, Long> map, int year) {
        Long amount = getAmountByCategory(report, cat);
        if (amount == null || amount == 0) return 0;

        LocalDate startDate = report.getContractStartDate();
        LocalDate endDate = report.getContractEndDate();

        // 날짜 유효성 검증
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            return 0;
        }

        // 전체 일수 계산
        long totalDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        long reportTotalInYear = 0;
        long allocatedAmount = 0;

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            long daysInMonth = getDaysInPeriod(current, startDate, endDate);
            
            // 해당 달이 계약의 마지막 달인지 판별
            boolean isLastMonth = (current.getYear() == endDate.getYear() && current.getMonthValue() == endDate.getMonthValue());
            
            long revenue;
            if (isLastMonth) {
                // 단수 조정: 마지막 달에는 총 금액에서 이전 달까지 누적된 금액을 빼서 나머지 금액을 모두 할당
                revenue = amount - allocatedAmount;
            } else {
                revenue = Math.round((double) (amount * daysInMonth) / totalDays);
            }
            allocatedAmount += revenue;

            if (current.getYear() == year) {
                accumulateToMap(map, current, revenue);
                reportTotalInYear += revenue;
            }
            current = current.plusMonths(1).withDayOfMonth(1);
        }
        return reportTotalInYear;
    }

    /**
     * 해당 월 내에서 수주보고서 기간이 차지하는 실제 일수를 계산합니다.
     */
    private long getDaysInPeriod(LocalDate current, LocalDate start, LocalDate end) {
        LocalDate monthStart = current.withDayOfMonth(1).isBefore(start) ? start : current.withDayOfMonth(1);
        LocalDate monthEnd = current.withDayOfMonth(current.lengthOfMonth()).isAfter(end) ? end : current.withDayOfMonth(current.lengthOfMonth());

        return ChronoUnit.DAYS.between(monthStart, monthEnd) + 1;
    }

    /** 맵에 기존 값이 있으면 더하고, 없으면 새로 넣습니다. */
    private void accumulateToMap(Map<String, Long> map, LocalDate date, long revenue) {
        String key = date.format(YEAR_MONTH_FORMATTER);
        map.put(key, map.getOrDefault(key, 0L) + revenue);
    }

    /** 제품 카테고리에 해당하는 수주보고서 금액을 매핑합니다. */
    private Long getAmountByCategory(OrderReport report, ProductCategory category) {
        return switch (category) {
            case EMS -> report.getEmsSummary();
            case ITG -> report.getItgSummary();
            case IOT -> report.getAiotionSummary();
            case ETC -> nullSafe(report.getItoSummary())
                    + nullSafe(report.getOtherSummary())
                    + nullSafe(report.getDashboardSummary());
            case EMS_MAINTENANCE -> report.getEmsMaintenanceSummary();
            case ITG_MAINTENANCE -> report.getItgMaintenanceSummary();
        };
    }

    @Transactional(readOnly = true)
    public List<EstimatedRevenueResponse> getAnnualRevenue(int targetYear) {
        LocalDate startOfYear = LocalDate.of(targetYear, 1, 1);
        LocalDate endOfYear = LocalDate.of(targetYear, 12, 31);

        List<OrderReport> activeReports = orderReportRepository.findAllOverlappingYear(startOfYear, endOfYear);
        return calculateTotalRevenue(activeReports, targetYear);
    }

    private long nullSafe(Long value) {
        return value == null ? 0L : value;
    }
}
