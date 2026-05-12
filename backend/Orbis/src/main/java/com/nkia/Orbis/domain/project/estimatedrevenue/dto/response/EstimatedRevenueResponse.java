package com.nkia.Orbis.domain.project.estimatedrevenue.dto.response;

import com.nkia.Orbis.domain.project.estimatedrevenue.enums.ProductCategory;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EstimatedRevenueResponse {
    private ProductCategory productCategory; // EMS, ITG, IoT, 기타, EMS 유지보수, ITG 유지보수
    private String CategoryName;
    private Map<String, Long> monthlyRevenue; // "2026-05": 1000000
    private Long totalAmount;

    public static EstimatedRevenueResponse of(ProductCategory category, Map<String, Long> monthlyMap, Long total) {
        return new EstimatedRevenueResponse(category, category.getDescription(), monthlyMap, total);
    }
}
