package com.nkia.Orbis.domain.bid.prb.dto.response;

import com.nkia.Orbis.common.constant.ApprovalStatus;
import com.nkia.Orbis.domain.admin.productmodule.entity.ProductClass;
import com.nkia.Orbis.domain.admin.user.entity.User;
import com.nkia.Orbis.domain.bid.prb.dto.vo.GeneralOverheadExpensesDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.IndirectExpensesDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PersonnelExpensesDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PrbProfitLossInfoDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PrbProjectInfoDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.ProductCostDto;
import com.nkia.Orbis.domain.bid.prb.dto.vo.PurchaseDto;
import com.nkia.Orbis.domain.bid.prb.entity.PrbHistory;
import com.nkia.Orbis.domain.company.entity.CompanyCategory;
import com.nkia.Orbis.domain.projectopportunity.projectopportunity.entity.ProjectOpportunity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrbHistoryResponseDto {

    // 0. History 식별 및 버전 정보
    private Long historyId;
    private Integer version;

    // 1. PRB 메타 정보
    private LocalDateTime createdAt; // 이력이 생성된 시간 (해당 버전이 저장된 시간)
    private LocalDate prbDate;
    private String prbCode;
    private String maintenanceDescription;
    private String salesRepresentativeOpinion;
    private ApprovalStatus status;
    private BigDecimal totalCost;

    // 2. User (영업 대표) 정보 - Flattening
    private UUID salesRepresentativeId;
    private String salesRepresentativeName;
    private String salesRepresentativeDepartmentName;

    private UUID reviewerId;
    private String reviewerName;

    // 3. ProjectOpportunity (사업 기회) 정보 - Flattening
    private Long projectOpportunityId;
    private String opportunityName;
    private ProductClass projectType;
    private String projectDescription;

    // 4. Company (고객사) 정보 - Flattening
    private String customerCompanyName;
    private CompanyCategory customerCompanyCategory;

    // 5. Value Objects (기존 DTO 재사용)
    private PrbProjectInfoDto projectInfo;
    private PrbProfitLossInfoDto profitLossInfo;
    private PersonnelExpensesDto personnelExpenses;
    private ProductCostDto productCost;
    private PurchaseDto purchase;
    private GeneralOverheadExpensesDto overheadExpenses;
    private IndirectExpensesDto indirectExpenses;

    public static PrbHistoryResponseDto from(PrbHistory entity) {
        if (entity == null) {
            return null;
        }

        PrbHistoryResponseDtoBuilder builder = PrbHistoryResponseDto.builder();

        mapBaseInfo(builder, entity);
        mapSalesRepresentativeInfo(builder, entity.getSalesRepresentative());
        mapReviewerInfo(builder, entity.getReviewer());
        mapProjectOpportunityInfo(builder, entity.getProjectOpportunity());
        mapValueObjects(builder, entity);

        return builder.build();
    }

    // --- Private Helper Methods ---

    private static void mapBaseInfo(PrbHistoryResponseDtoBuilder builder, PrbHistory entity) {
        builder.historyId(entity.getId())
                .version(entity.getVersion())
                .prbCode(entity.getPrbCode())
                .createdAt(entity.getCreatedAt())
                .prbDate(entity.getPrbDate())
                .maintenanceDescription(entity.getMaintenanceDescription())
                .salesRepresentativeOpinion(entity.getSalesRepresentativeOpinion())
                .status(entity.getStatus())
                .totalCost(entity.getTotalCost());
    }

    private static void mapSalesRepresentativeInfo(PrbHistoryResponseDtoBuilder builder, User salesRep) {
        if (salesRep == null) {
            return;
        }
        builder.salesRepresentativeId(salesRep.getId())
                .salesRepresentativeName(salesRep.getName())
                .salesRepresentativeDepartmentName(
                        salesRep.getDepartment() != null ? salesRep.getDepartment().getTeam() : null);
    }

    private static void mapReviewerInfo(PrbHistoryResponseDtoBuilder builder, User reviewer) {
        if (reviewer == null) {
            return;
        }
        builder.reviewerId(reviewer.getId())
                .reviewerName(reviewer.getName());
    }

    private static void mapProjectOpportunityInfo(PrbHistoryResponseDtoBuilder builder, ProjectOpportunity opp) {
        if (opp == null) {
            return;
        }
        builder.projectOpportunityId(opp.getId())
                .opportunityName(opp.getOpportunityName())
                .projectType(opp.getProjectType())
                .projectDescription(opp.getDescription());

        if (opp.getCustomerCompany() != null) {
            builder.customerCompanyName(opp.getCustomerCompany().getName())
                    .customerCompanyCategory(opp.getCustomerCompany().getCategory());
        }
    }

    private static void mapValueObjects(PrbHistoryResponseDtoBuilder builder, PrbHistory entity) {
        // 기존 PrbDto의 VO 변환 메서드들을 그대로 재사용합니다.
        builder.projectInfo(PrbProjectInfoDto.from(entity.getProjectInfo()))
                .profitLossInfo(PrbProfitLossInfoDto.from(entity.getProfitLossInfo()))
                .personnelExpenses(PersonnelExpensesDto.from(entity.getPersonnelExpenses()))
                .productCost(ProductCostDto.from(entity.getProductCost()))
                .purchase(PurchaseDto.from(entity.getPurchase()))
                .overheadExpenses(GeneralOverheadExpensesDto.from(entity.getGeneralOverheadExpenses()))
                .indirectExpenses(IndirectExpensesDto.from(entity.getIndirectExpenses()));
    }
}