package com.nkia.Orbis.domain.project.project.dto.response;

import com.nkia.Orbis.domain.project.project.entity.Project;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectListResponse {

    private Long id;                       // 시스템 식별자
    private String customerName;           // 1) 고객사
    private String projectName;            // 2) 사업명
    private Long totalAmount;              // 3) 사업금액
    private LocalDate startDate;           // 4) 사업개시일
    private LocalDate endDate;             // 5) 사업완료일
    private String pmName;                 // 6) PM 이름
    private String salesRepresentativeName;// 7) 영업대표
    private boolean hasResultReport;       // 결과보고서 등록 여부

    public static ProjectListResponse from(Project project) {
        String customer = (project.getOrderReport() != null && project.getOrderReport().getFinalCustomerCompany() != null)
                ? project.getOrderReport().getFinalCustomerCompany().getName() : null;

        String pm = (project.getManager() != null)
                ? project.getManager().getName()
                : (project.getOrderReport() != null && project.getOrderReport().getPm() != null
                        ? project.getOrderReport().getPm().getName() : null);

        String salesRep = (project.getSalesRepresentative() != null)
                ? project.getSalesRepresentative().getName() : null;

        return ProjectListResponse.builder()
                .id(project.getId())
                .customerName(customer)
                .projectName(project.getPjtName())
                .totalAmount(project.getTotalAmount())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .pmName(pm)
                .salesRepresentativeName(salesRep)
                .hasResultReport(project.getResultReports() != null && !project.getResultReports().isEmpty())
                .build();
    }
}