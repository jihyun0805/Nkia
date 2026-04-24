package com.nkia.Orbis.domain.bid.prb.entity;

import com.nkia.Orbis.common.entity.BaseEntity;
import com.nkia.Orbis.domain.bid.prbresult.entity.PrbResult;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import com.nkia.Orbis.domain.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Prb extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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
}
