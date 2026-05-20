package com.nkia.Orbis.domain.bid.prb.entity;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
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
import java.math.BigDecimal;
import java.time.LocalDate;
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
public class PrbHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 변경 이력 버전
    @Column(nullable = false)
    private Integer version;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

    @Column(name = "prb_code", nullable = false, length = 50)
    private String prbCode;

    @Column(name = "prb_date", nullable = false)
    private LocalDate prbDate;

    @Column(name = "maintenance_description", columnDefinition = "TEXT")
    private String maintenanceDescription;

    @Column(name = "prb_total_cost", precision = 15, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "sales_representative_opinion", columnDefinition = "TEXT")
    private String salesRepresentativeOpinion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_opportunity_id")
    private ProjectOpportunity projectOpportunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_representative_id")
    private User salesRepresentative;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    // VO 객체들은 깊은 복사(Deep Copy)를 통해 새 객체로 할당해야 합니다.
    @Embedded
    private PrbProjectInfo projectInfo;

    @Embedded
    private PrbProfitLossInfo profitLossInfo;

    @Embedded
    private PersonnelExpensesHistory personnelExpenses;

    @Embedded
    private ProductCostHistory productCost;

    @Embedded
    private PurchaseHistory purchase;

    @Embedded
    private GeneralOverheadExpensesHistory generalOverheadExpenses;

    @Embedded
    private IndirectExpenses indirectExpenses;

    /**
     * 원본 Prb 객체를 받아 History 객체를 생성하는 팩토리 메서드
     */
    public static PrbHistory createSnapshot(Prb prb, Integer version) {
        return PrbHistory.builder()
                .version(version)
                .status(prb.getStatus())
                .prbCode(prb.getPrbCode())
                .prbDate(prb.getPrbDate())
                .maintenanceDescription(prb.getMaintenanceDescription())
                .totalCost(prb.getTotalCost())
                .salesRepresentativeOpinion(prb.getSalesRepresentativeOpinion())
                .projectOpportunity(prb.getProjectOpportunity())
                .salesRepresentative(prb.getSalesRepresentative())
                .reviewer(prb.getReviewer())

                // VO 복사 (null-safe 처리)
                .projectInfo(prb.getProjectInfo() != null ? prb.getProjectInfo().copy() : null)
                .profitLossInfo(prb.getProfitLossInfo() != null ? prb.getProfitLossInfo().copy() : null)
                .personnelExpenses(PersonnelExpensesHistory.from(prb.getPersonnelExpenses()))
                .productCost(ProductCostHistory.from(prb.getProductCost()))
                .purchase(PurchaseHistory.from(prb.getPurchase()))
                .generalOverheadExpenses(GeneralOverheadExpensesHistory.from(prb.getGeneralOverheadExpenses()))
                .indirectExpenses(prb.getIndirectExpenses() != null ? prb.getIndirectExpenses().copy() : null)
                .build();
    }
}