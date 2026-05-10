package com.nkia.Orbis.domain.bid.prb.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Prb extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // 1. PRB 코드
  @Column(name = "prb_code", unique = true, nullable = false, updatable = false, length = 50)
  private String prbCode;

  // 2. PRB 일자
  @Column(name = "prb_date", nullable = false)
  private LocalDate prbDate;

  // 3. 유지보수 내용
  @Column(name = "maintenance_description", columnDefinition = "TEXT")
  private String maintenanceDescription;

  // 4. 비용 합계 (BigDecimal 사용)
  @Column(name = "total_cost", precision = 15, scale = 2)
  private BigDecimal totalCost;

  // 5. 영업 대표 의견
  @Column(name = "sales_representative_opinion", columnDefinition = "TEXT")
  private String salesRepresentativeOpinion;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "project_opportunity_id")
  private ProjectOpportunity projectOpportunity;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "sales_representative_id")
  private User salesRepresentative;

  @Embedded
  private PrbProjectInfo projectInfo;

  @Embedded
  private PrbProfitLossInfo profitLossInfo;

  @Embedded
  private PersonnelExpenses personnelExpenses;

  @Embedded
  private ProductCost productCost;

  @Embedded
  private Purchase purchase;

  @Embedded
  private GeneralOverheadExpenses generalOverheadExpenses;

  @Embedded
  private IndirectExpenses indirectExpenses;

  @OneToMany(mappedBy = "prb", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<PrbResult> prbResults = new ArrayList<>();

  /**
   * PRB 전체 비용 합계 및 간접비 오케스트레이션 (비즈니스 메서드)
   *
   * @param indirectExpenseRate 외부(프론트 또는 설정)에서 주입받는 간접비율 (%)
   */
  public void calculateTotalCost(BigDecimal indirectExpenseRate) {
    // 1. 간접비 적용 대상 금액(Base Cost) 합산 (Null Safe 처리 필수)
    BigDecimal baseCost = calculateBaseCost();

    // 2. 간접비(IndirectExpenses) 계산 위임
    if (this.indirectExpenses == null) {
      this.indirectExpenses = new IndirectExpenses();
    }
    this.indirectExpenses.calculateIndirectExpense(baseCost, indirectExpenseRate);

    // 3. PRB 최종 총 비용(Total Cost) 확정
    this.totalCost = baseCost.add(this.indirectExpenses.getAmount());
  }

  private BigDecimal calculateBaseCost() {
    BigDecimal personnel = getSafeAmount(
        this.personnelExpenses != null ? this.personnelExpenses.getTotalAmount() : null);
    BigDecimal product =
        getSafeAmount(this.productCost != null ? this.productCost.getTotalProductCost() : null);
    BigDecimal purchaseAmt =
        getSafeAmount(this.purchase != null ? this.purchase.getTotalPurchaseAmount() : null);
    BigDecimal overhead = getSafeAmount(this.generalOverheadExpenses != null
        ? this.generalOverheadExpenses.getTotalAmount()
        : null);

    return personnel.add(product).add(purchaseAmt).add(overhead);
  }

  // NullPointerException 방지를 위한 내부 유틸 메서드
  private BigDecimal getSafeAmount(BigDecimal amount) {
    return amount == null ? BigDecimal.ZERO : amount;
  }
}
