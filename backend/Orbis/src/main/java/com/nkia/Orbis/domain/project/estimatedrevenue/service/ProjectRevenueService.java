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
@Transactional(readOnly = true)
public class ProjectRevenueService {

    private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
    private final OrderReportRepository orderReportRepository;
    /**
     * 올해 진행되는 전체 수주보고서의 제품군별/월별 매출 합계 계산
     */
    public List<EstimatedRevenueResponse> calculateTotalRevenue(List<OrderReport> reports, int targetYear) {
        List<EstimatedRevenueResponse> results = new ArrayList<>();

        for (ProductCategory category : ProductCategory.values()) {
            Map<String, Long> aggregateMap = new TreeMap<>();
            long categoryTotal = 0;

            for (OrderReport report : reports) {
                categoryTotal += processReportProration(report, category, aggregateMap, targetYear);
            }

            results.add(EstimatedRevenueResponse.of(category, aggregateMap, categoryTotal));
        }
        return results;
    }

    /**
     * 개별 수주보고서의 일할 계산 및 월별 누적 처리
     */
    private long processReportProration(OrderReport report, ProductCategory cat, Map<String, Long> map, int year) {
        Long amount = getAmountByCategory(report, cat);
        if (amount == null || amount == 0) return 0;

        LocalDate startDate = report.getContractStartDate();
        LocalDate endDate = report.getContractEndDate();

        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            return 0;
        }

        long totalDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        return calculateAndAccumulateMonthlyRevenue(startDate, endDate, amount, totalDays, year, map);
    }

    /**
     * 기간에 따른 월별 매출액 계산 및 누적
     */
    private long calculateAndAccumulateMonthlyRevenue(LocalDate startDate, LocalDate endDate, long amount, long totalDays, int targetYear, Map<String, Long> map) {
        long reportTotalInYear = 0;
        long allocatedAmount = 0;

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            long revenue = calculateMonthlyRevenue(current, startDate, endDate, amount, totalDays, allocatedAmount);
            allocatedAmount += revenue;

            if (current.getYear() == targetYear) {
                accumulateToMap(map, current, revenue);
                reportTotalInYear += revenue;
            }
            current = current.plusMonths(1).withDayOfMonth(1);
        }
        return reportTotalInYear;
    }

    /**
     * 해당 월의 매출액 계산 (마지막 달 단수 조정 포함)
     */
    private long calculateMonthlyRevenue(LocalDate current, LocalDate startDate, LocalDate endDate, long amount, long totalDays, long allocatedAmount) {
        boolean isLastMonth = (current.getYear() == endDate.getYear() && current.getMonthValue() == endDate.getMonthValue());
        
        if (isLastMonth) {
            return amount - allocatedAmount;
        }
        
        long daysInMonth = getDaysInPeriod(current, startDate, endDate);
        return Math.round((double) (amount * daysInMonth) / totalDays);
    }

    /**
     * 해당 월 내에서 수주보고서 기간이 차지하는 실제 일수 계산
     */
    private long getDaysInPeriod(LocalDate current, LocalDate start, LocalDate end) {
        LocalDate monthStart = current.withDayOfMonth(1).isBefore(start) ? start : current.withDayOfMonth(1);
        LocalDate monthEnd = current.withDayOfMonth(current.lengthOfMonth()).isAfter(end) ? end : current.withDayOfMonth(current.lengthOfMonth());

        return ChronoUnit.DAYS.between(monthStart, monthEnd) + 1;
    }

    /**
     * 맵에 기존 값이 있으면 더하고, 없으면 새로 넣음
     */
    private void accumulateToMap(Map<String, Long> map, LocalDate date, long revenue) {
        String key = date.format(YEAR_MONTH_FORMATTER);
        map.put(key, map.getOrDefault(key, 0L) + revenue);
    }

    /**
     * 제품 카테고리에 해당하는 수주보고서 금액 매핑
     */
    private Long getAmountByCategory(OrderReport report, ProductCategory category) {
        return switch (category) {
            case EMS -> nullSafe(report.getEmsSummary());
            case ITG -> nullSafe(report.getItgSummary());
            case IOT -> nullSafe(report.getAiotionSummary());
            case ETC -> nullSafe(report.getItoSummary())
                    + nullSafe(report.getOtherSummary())
                    + nullSafe(report.getDashboardSummary());
            case EMS_MAINTENANCE -> nullSafe(report.getEmsMaintenanceSummary());
            case ITG_MAINTENANCE -> nullSafe(report.getItgMaintenanceSummary());
        };
    }

    /**
     * 지정된 연도의 전사 예상 매출액 조회
     */
    @Transactional(readOnly = true)
    public List<EstimatedRevenueResponse> getAnnualRevenue(int targetYear) {
        LocalDate startOfYear = LocalDate.of(targetYear, 1, 1);
        LocalDate endOfYear = LocalDate.of(targetYear, 12, 31);

        List<OrderReport> activeReports = orderReportRepository.findAllOverlappingYear(startOfYear, endOfYear);
        return calculateTotalRevenue(activeReports, targetYear);
    }

    /**
     * Null 방어 및 기본값 0 반환
     */
    private long nullSafe(Long value) {
        return value == null ? 0L : value;
    }
}