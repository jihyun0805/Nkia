package com.nkia.Orbis.domain.bid.prb.dto.request;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prb.dto.vo.GeneralOverheadExpenseItemDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PersonnelExpenseItemDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PrbProfitLossInfoDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PrbProjectInfoDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.ProductCostItemDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PurchaseHumanResourceItemDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PurchaseProductItemDto;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbUpdateRequestDto {

    // 사업 기회
    @NotNull(message = "사업 기회 ID는 필수입니다.")
    private Long projectOpportunityId;

    // 영업 대표
    @NotNull(message = "영업 대표 ID는 필수입니다.")
    private UUID salesRepresentativeId;

    // 검토자
    @NotNull(message = "검토자 ID는 필수입니다.")
    private UUID reviewerId;

    // PRB 일자
    @NotNull(message = "PRB 일자는 필수입니다.")
    private LocalDate prbDate;

    // 유지보수
    private String maintenanceDescription;
    // 영업 대표 의견
    private String salesRepresentativeOpinion;

    // 간접 비율
    @NotNull(message = "간접비율은 필수입니다.")
    private BigDecimal indirectExpenseRate;

    @Valid
    private PrbProjectInfoDto projectInfo;

    @Valid
    private PrbProfitLossInfoDto profitLossInfo;

    @Valid
    private List<PersonnelExpenseItemDto> residentExpenses;

    @Valid
    private List<PersonnelExpenseItemDto> nonResidentExpenses;

    @Valid
    private List<ProductCostItemDto> productCostItems;

    @Valid
    private List<PurchaseHumanResourceItemDto> purchaseHumanResources;

    @Valid
    private List<PurchaseProductItemDto> purchaseProducts;

    @Valid
    private List<GeneralOverheadExpenseItemDto> overheadExpenses;

    public void updateEntity(Prb prb, User newSalesRepresentative, User reviewer,
                             ProjectOpportunity projectOpportunity) {
        updateBasePrb(prb, newSalesRepresentative, reviewer, projectOpportunity);
        updateSingleValueObjects(prb);
        updateCollectionValueObjects(prb);
    }

    // --- Private Helper Methods ---

    private void updateBasePrb(Prb prb, User newSalesRepresentative, User reviewer,
                               ProjectOpportunity projectOpportunity) {
        prb.updateBasicInfo(this.prbDate, this.maintenanceDescription, this.salesRepresentativeOpinion,
                newSalesRepresentative, reviewer, projectOpportunity);
    }

    private void updateSingleValueObjects(Prb prb) {
        if (this.projectInfo != null) {
            prb.updateProjectInfo(this.projectInfo.toEntity());
        }
        if (this.profitLossInfo != null) {
            prb.updateProfitLossInfo(this.profitLossInfo.toEntity());
        }
    }

    private void updateCollectionValueObjects(Prb prb) {
        prb.getPersonnelExpenses()
                .updateExpenses(mapListSafely(this.residentExpenses, PersonnelExpenseItemDto::toEntity),
                        mapListSafely(this.nonResidentExpenses, PersonnelExpenseItemDto::toEntity));

        prb.getProductCost()
                .updateItems(mapListSafely(this.productCostItems, ProductCostItemDto::toEntity));

        prb.getPurchase()
                .updatePurchases(
                        mapListSafely(this.purchaseHumanResources, PurchaseHumanResourceItemDto::toEntity),
                        mapListSafely(this.purchaseProducts, PurchaseProductItemDto::toEntity));

        prb.getGeneralOverheadExpenses()
                .updateExpenses(
                        mapListSafely(this.overheadExpenses, GeneralOverheadExpenseItemDto::toEntity));
    }

    private <T, R> List<R> mapListSafely(List<T> list, Function<T, R> mapper) {
        return list == null ? null : list.stream().map(mapper).toList();
    }
}
