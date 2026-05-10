package com.nkia.Orbis.domain.bid.prb.dto.request;

import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prb.dto.vo.*;
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
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
public class PrbCreateRequestDto {

  // 1. 연관관계 ID (필수값 검증)
  @NotNull(message = "사업 기회 ID는 필수입니다.")
  private Long projectOpportunityId;

  @NotNull(message = "영업 대표 ID는 필수입니다.")
  private UUID salesRepresentativeId;

  // 2. PRB 기본 정보
  @NotNull(message = "PRB 일자는 필수입니다.")
  private LocalDate prbDate;

  private String maintenanceDescription;
  private String salesRepresentativeOpinion;

  @NotNull(message = "간접비율은 필수입니다.")
  private BigDecimal indirectExpenseRate; // 간접비율 (%)

  // 3. 단일 VO 정보 (프로젝트 일정/비율, 손익 정보)
  @Valid // 내부 DTO의 필드도 검증하고 싶을 때 사용
  private PrbProjectInfoDto projectInfo;

  @Valid
  private PrbProfitLossInfoDto profitLossInfo;

  // 4. 비용 관련 리스트 정보 (단일 아이템 DTO 사용)
  // 클라이언트는 '합계(Subtotal)'를 보낼 필요 없이 아이템 리스트만 배열로 보냅니다.
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

  public Prb toEntity(String prbCode, User salesRepresentative, ProjectOpportunity opportunity) {
    Prb prb = buildBasePrb(prbCode, salesRepresentative, opportunity);
    mapSingleValueObjects(prb);
    mapCollectionValueObjects(prb);
    return prb;
  }

  // --- Private Helper Methods ---

  private Prb buildBasePrb(String prbCode, User salesRepresentative,
      ProjectOpportunity opportunity) {
    return Prb.builder()
        .prbCode(prbCode)
        .prbDate(this.prbDate)
        .maintenanceDescription(this.maintenanceDescription)
        .salesRepresentativeOpinion(this.salesRepresentativeOpinion)
        .salesRepresentative(salesRepresentative)
        .projectOpportunity(opportunity)
        .build();
  }

  private void mapSingleValueObjects(Prb prb) {
    if (this.projectInfo != null)
      prb.updateProjectInfo(this.projectInfo.toEntity());
    if (this.profitLossInfo != null)
      prb.updateProfitLossInfo(this.profitLossInfo.toEntity());
  }

  private void mapCollectionValueObjects(Prb prb) {
    if (this.residentExpenses != null || this.nonResidentExpenses != null) {
      prb.getPersonnelExpenses()
          .updateExpenses(mapListSafely(this.residentExpenses, PersonnelExpenseItemDto::toEntity),
              mapListSafely(this.nonResidentExpenses, PersonnelExpenseItemDto::toEntity));
    }

    if (this.productCostItems != null) {
      prb.getProductCost()
          .updateItems(mapListSafely(this.productCostItems, ProductCostItemDto::toEntity));
    }

    if (this.purchaseHumanResources != null || this.purchaseProducts != null) {
      prb.getPurchase()
          .updatePurchases(
              mapListSafely(this.purchaseHumanResources, PurchaseHumanResourceItemDto::toEntity),
              mapListSafely(this.purchaseProducts, PurchaseProductItemDto::toEntity));
    }

    if (this.overheadExpenses != null) {
      prb.getGeneralOverheadExpenses()
          .updateExpenses(
              mapListSafely(this.overheadExpenses, GeneralOverheadExpenseItemDto::toEntity));
    }
  }

  // List Null-safe 매핑 유틸리티
  private <T, R> List<R> mapListSafely(List<T> list, Function<T, R> mapper) {
    return list == null ? null : list.stream().map(mapper).toList();
  }
}
