package com.nkia.Orbis.domain.contract.orderreport.dto.response;

import com.nkia.Orbis.domain.contract.orderreport.entity.CodeType;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReport;
import com.nkia.Orbis.domain.contract.orderreport.entity.OrderReportType;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderReportListResponse {

    private Long id;

    private String orderReportCode;

    private Long totalAmount;

    private OrderReportType type;

    private boolean channel;

    private CodeType codeType;

    private LocalDate contractDate;

    private Integer contractPeriodMonths;

    // TODO: 사업 기회 구현 후 형식에 맞게 반환(사업명)
    private Long projectOpportunityId;

    private UUID pmId;

    private String pmName;

    private Long finalCustomerCompanyId;

    private String finalCustomerCompanyName;

    // Todo: Company, CompanyManager 구현후 연동 예정
    public static OrderReportListResponse from(OrderReport orderReport) {
        return OrderReportListResponse.builder()
                .id(orderReport.getId())
                .orderReportCode(orderReport.getOrderReportCode())
                .totalAmount(orderReport.getTotalAmount())
                .type(orderReport.getType())
                .channel(orderReport.isChannel())
                .codeType(orderReport.getCodeType())
                .contractDate(orderReport.getContractDate())
                .contractPeriodMonths(orderReport.getContractPeriodMonths())
                .projectOpportunityId(orderReport.getProjectOpportunity().getId())
                .pmId(orderReport.getPm() != null ? orderReport.getPm().getId() : null)
                .pmName(orderReport.getPm() != null ? orderReport.getPm().getName() : null)
//
//
//                .finalCustomerCompanyId(
//                        orderReport.getFinalCustomerCompany() != null ? orderReport.getFinalCustomerCompany().getId()
//                                : null)
//                .finalCustomerCompanyName(
//                        orderReport.getFinalCustomerCompany() != null ? orderReport.getFinalCustomerCompany()
//                                .getCompanyName() : null)

                .finalCustomerCompanyId(null)
                .finalCustomerCompanyName(null)
                .build();
    }
}
