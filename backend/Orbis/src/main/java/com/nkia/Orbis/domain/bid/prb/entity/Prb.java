package com.nkia.Orbis.domain.bid.prb.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Entity
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted = false")
public class Prb extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status = ApprovalStatus.DRAFT;

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
    @Column(name = "prb_total_cost", precision = 15, scale = 2)
    private BigDecimal totalCost;

    // 5. 영업 대표 의견
    @Column(name = "sales_representative_opinion", columnDefinition = "TEXT")
    private String salesRepresentativeOpinion;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id", unique = true)
    private ProjectOpportunity projectOpportunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    @Builder.Default
    @Embedded
    private PrbProjectInfo projectInfo = new PrbProjectInfo();

    @Builder.Default
    @Embedded
    private PrbProfitLossInfo profitLossInfo = new PrbProfitLossInfo();

    @Builder.Default
    @Embedded
    private PersonnelExpenses personnelExpenses = new PersonnelExpenses();

    @Builder.Default
    @Embedded
    private ProductCost productCost = new ProductCost();

    @Builder.Default
    @Embedded
    private Purchase purchase = new Purchase();

    @Builder.Default
    @Embedded
    private GeneralOverheadExpenses generalOverheadExpenses = new GeneralOverheadExpenses();

    @Builder.Default
    @Embedded
    private IndirectExpenses indirectExpenses = new IndirectExpenses();

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

    // 기본 정보 수정 메서드
    public void updateBasicInfo(LocalDate prbDate, String maintenanceDescription,
                                String salesRepresentativeOpinion, User salesRepresentative) {
        this.prbDate = prbDate;
        this.maintenanceDescription = maintenanceDescription;
        this.salesRepresentativeOpinion = salesRepresentativeOpinion;
        if (salesRepresentative != null) {
            this.salesRepresentative = salesRepresentative;
        }
    }

    public void updateProjectInfo(PrbProjectInfo projectInfo) {
        this.projectInfo = projectInfo;
    }

    public void updateProfitLossInfo(PrbProfitLossInfo profitLossInfo) {
        this.profitLossInfo = profitLossInfo;
    }

    public void assignProjectOpportunity(ProjectOpportunity projectOpportunity) {
        this.projectOpportunity = projectOpportunity;
    }

    public void submit() {
        this.status = ApprovalStatus.PENDING;
    }

    public void approve() {
        this.status = ApprovalStatus.APPROVED;
    }

    public void reject() {
        this.status = ApprovalStatus.REJECTED;
    }

    public void cancel() {
        this.status = ApprovalStatus.CANCELED;
    }

    public boolean isDraft() {
        return this.status == ApprovalStatus.DRAFT;
    }
}
