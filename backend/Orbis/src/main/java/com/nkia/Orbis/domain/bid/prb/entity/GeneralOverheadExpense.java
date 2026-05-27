package com.nkia.Orbis.domain.bid.prb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GeneralOverheadExpense {

    // 1. 대분류
    @Column(name = "major_category", length = 50)
    private String majorCategory;

    // 2. 소분류
    @Column(name = "minor_category", length = 50)
    private String minorCategory;

    // 3. 내역 및 산출 근거 (긴 글 작성을 대비해 TEXT 타입 지정)
    @Column(name = "details_and_basis", columnDefinition = "TEXT")
    private String detailsAndBasis;

    // 4. 단가
    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    // 5. 금액
    @Column(name = "general_overhead_amount", precision = 15, scale = 2)
    private BigDecimal amount;

    public GeneralOverheadExpense(String majorCategory, String minorCategory, String detailsAndBasis,
                                  BigDecimal unitPrice, BigDecimal amount) {
        this.majorCategory = majorCategory;
        this.minorCategory = minorCategory;
        this.detailsAndBasis = detailsAndBasis;
        this.unitPrice = unitPrice;
        this.amount = amount;
    }

    public GeneralOverheadExpense copy() {
        return new GeneralOverheadExpense(
                this.majorCategory,
                this.minorCategory,
                this.detailsAndBasis,
                this.unitPrice,
                this.amount
        );
    }
}
