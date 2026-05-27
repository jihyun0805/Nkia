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
public class PrbCreateRequestDto {

    // 1. 연관관계 ID (필수값 검증)
    @NotNull(message = "사업 기회 ID는 필수입니다.")
    private Long projectOpportunityId;

    @NotNull(message = "영업 대표 ID는 필수입니다.")
    private UUID salesRepresentativeId;

    private UUID reviewerId;

    // 2. PRB 기본 정보
    // PRB 일자
    @NotNull(message = "PRB 일자는 필수입니다.")
    private LocalDate prbDate;

    // PRB 코드 현재 백엔드에서 생성 중

    // 유지보수
    private String maintenanceDescription;

    // 영업 대표 의견
    private String salesRepresentativeOpinion;

    // 간접비 비율
    // 생성할 때에는 간접비 비율만 받으면 간접비 VO 채울 수 있음
    @NotNull(message = "간접비율은 필수입니다.")
    private BigDecimal indirectExpenseRate; // 간접비율 (%)

    // 3. 단일 VO 정보 (프로젝트 일정/비율, 손익 정보)
    // 사업 관련 정보
    @Valid // 내부 DTO의 필드도 검증하고 싶을 때 사용
    private PrbProjectInfoDto projectInfo;

    // 손익 정보
    @Valid
    private PrbProfitLossInfoDto profitLossInfo;

    // 4. 비용 관련 리스트 정보 (단일 아이템 DTO 사용)
    // 클라이언트는 '합계(Subtotal)'를 보낼 필요 없이 아이템 리스트만 배열로 보냅니다.

    // 상주 인건비
    @Valid
    private List<PersonnelExpenseItemDto> residentExpenses;

    // 비상주 인건비
    @Valid
    private List<PersonnelExpenseItemDto> nonResidentExpenses;

    // 제품 원가
    @Valid
    private List<ProductCostItemDto> productCostItems;

    // 용역 매입
    @Valid
    private List<PurchaseHumanResourceItemDto> purchaseHumanResources;

    // 용역 제품
    @Valid
    private List<PurchaseProductItemDto> purchaseProducts;

    // 제경비
    @Valid
    private List<GeneralOverheadExpenseItemDto> overheadExpenses;

    public Prb toEntity(String prbCode, User salesRepresentative, User reviewer, ProjectOpportunity opportunity) {
        Prb prb = buildBasePrb(prbCode, salesRepresentative, reviewer, opportunity);
        mapSingleValueObjects(prb);
        mapCollectionValueObjects(prb);
        return prb;
    }

    // --- Private Helper Methods ---

    private Prb buildBasePrb(String prbCode, User salesRepresentative, User reviewer, ProjectOpportunity opportunity) {
        return Prb.builder()
                .prbCode(prbCode)
                .prbDate(this.prbDate)
                .maintenanceDescription(this.maintenanceDescription)
                .salesRepresentativeOpinion(this.salesRepresentativeOpinion)
                .salesRepresentative(salesRepresentative)
                .reviewer(reviewer)
                .projectOpportunity(opportunity)
                .build();
    }

    private void mapSingleValueObjects(Prb prb) {
        if (this.projectInfo != null) {
            prb.updateProjectInfo(this.projectInfo.toEntity());
        }
        if (this.profitLossInfo != null) {
            prb.updateProfitLossInfo(this.profitLossInfo.toEntity());
        }
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
