package com.nkia.Orbis.domain.bid.prb.dto.request;

import com.nkia.Orbis.domain.bid.prb.dto.vo.*;
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
}
