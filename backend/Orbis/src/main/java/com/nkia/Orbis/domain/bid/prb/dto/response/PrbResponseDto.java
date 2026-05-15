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
import com.nkia.Orbis.domain.bid.prb.entity.Prb;
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
public class PrbResponseDto {

    // 1. PRB 메타 정보
    private Long prbId;
    private String prbCode;
    private LocalDateTime createdAt;
    private LocalDate prbDate;
    private String maintenanceDescription;
    private String salesRepresentativeOpinion;
    private Long workflowId;
    private ApprovalStatus status;

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

    public static PrbResponseDto from(Prb entity) {
        if (entity == null) {
            return null;
        }

        PrbResponseDtoBuilder builder = PrbResponseDto.builder();

        mapBaseInfo(builder, entity);
        mapSalesRepresentativeInfo(builder, entity.getSalesRepresentative());
        mapProjectOpportunityInfo(builder, entity.getProjectOpportunity());
        mapValueObjects(builder, entity);

        return builder.build();
    }

    // --- Private Helper Methods ---

    private static void mapBaseInfo(PrbResponseDtoBuilder builder, Prb entity, Long workflowId) {
        builder.prbId(entity.getId())
                .prbCode(entity.getPrbCode())
                .createdAt(entity.getCreatedAt())
                .prbDate(entity.getPrbDate())
                .maintenanceDescription(entity.getMaintenanceDescription())
                .salesRepresentativeOpinion(entity.getSalesRepresentativeOpinion())
                .workflowId(workflowId)
                .status(entity.getStatus())
                .totalCost(entity.getTotalCost());
    }

    private static void mapSalesRepresentativeInfo(PrbResponseDtoBuilder builder, User salesRep) {
        if (salesRep == null) {
            return;
        }
        builder.salesRepresentativeId(salesRep.getId())
                .salesRepresentativeName(salesRep.getName())
                .salesRepresentativeDepartmentName(
                        salesRep.getDepartment() != null ? salesRep.getDepartment().getTeam() : null);
    }

    private static void mapProjectOpportunityInfo(PrbResponseDtoBuilder builder,
                                                  ProjectOpportunity opp) {
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

    private static void mapValueObjects(PrbResponseDtoBuilder builder, Prb entity) {
        builder.projectInfo(PrbProjectInfoDto.from(entity.getProjectInfo()))
                .profitLossInfo(PrbProfitLossInfoDto.from(entity.getProfitLossInfo()))
                .personnelExpenses(PersonnelExpensesDto.from(entity.getPersonnelExpenses()))
                .productCost(ProductCostDto.from(entity.getProductCost()))
                .purchase(PurchaseDto.from(entity.getPurchase()))
                .overheadExpenses(GeneralOverheadExpensesDto.from(entity.getGeneralOverheadExpenses()))
                .indirectExpenses(IndirectExpensesDto.from(entity.getIndirectExpenses()));
    }
}
