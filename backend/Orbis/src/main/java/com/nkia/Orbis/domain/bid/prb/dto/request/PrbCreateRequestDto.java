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
}
