package com.nkia.Orbis.domain.bid.prb.dto.response;

import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.bid.prb.dto.vo.*;
import com.nkia.Orbis.domain.company.entity.CompanyCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbResponseDto {

  // 1. PRB 메타 정보
  private Long prbId;
  private String prbCode;
  private LocalDateTime createdAt;
  private LocalDate prbDate;
  private String maintenanceDescription;
  private String salesRepresentativeOpinion;

  // 백엔드에서 최종 계산된 PRB 총 원가
  private BigDecimal totalCost;

  // 2. User (영업 대표) 정보 - Flattening
  private UUID salesRepresentativeId;
  private String salesRepresentativeName;
  private String salesRepresentativeDepartmentName;

  // 3. ProjectOpportunity (사업 기회) 정보 - Flattening
  private Long projectOpportunityId;
  private String opportunityName;
  private ProductClass projectType;
  private String projectDescription;

  // 4. Company (고객사) 정보 - Flattening
  private String customerCompanyName;
  private CompanyCategory customerCompanyCategory;

  // 5. Value Objects (리스트 및 백엔드에서 계산된 '소계/합계' 포함)
  private PrbProjectInfoDto projectInfo;
  private PrbProfitLossInfoDto profitLossInfo;

  private PersonnelExpensesDto personnelExpenses;       // 상주/비상주 리스트 + 인건비 합계
  private ProductCostDto productCost;                   // 제품 리스트 + 제품 원가 합계
  private PurchaseDto purchase;                         // 매입 용역/제품 리스트 + 매입 합계
  private GeneralOverheadExpensesDto overheadExpenses;  // 제경비 리스트 + 제경비 합계
  private IndirectExpensesDto indirectExpenses;         // 대상 금액, 간접비율, 간접비 합계
}
