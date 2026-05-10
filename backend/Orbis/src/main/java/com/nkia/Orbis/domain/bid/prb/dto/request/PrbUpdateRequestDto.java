package com.nkia.Orbis.domain.bid.prb.dto.request;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prb.dto.vo.*;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbUpdateRequestDto {

  // 영업 대표 변경 가능
  @NotNull(message = "영업 대표 ID는 필수입니다.")
  private UUID salesRepresentativeId;

  @NotNull(message = "PRB 일자는 필수입니다.")
  private LocalDate prbDate;

  private String maintenanceDescription;
  private String salesRepresentativeOpinion;

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

  public void updateEntity(Prb prb, User newSalesRepresentative) {
    updateBasePrb(prb, newSalesRepresentative);
    updateSingleValueObjects(prb);
    updateCollectionValueObjects(prb);
  }

  // --- Private Helper Methods ---

  private void updateBasePrb(Prb prb, User newSalesRepresentative) {
    prb.updateBasicInfo(this.prbDate, this.maintenanceDescription, this.salesRepresentativeOpinion,
        newSalesRepresentative);
  }

  private void updateSingleValueObjects(Prb prb) {
    if (this.projectInfo != null)
      prb.updateProjectInfo(this.projectInfo.toEntity());
    if (this.profitLossInfo != null)
      prb.updateProfitLossInfo(this.profitLossInfo.toEntity());
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
