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

    private Long id;                       // 시스템 식별자 (버튼 클릭 시 ID 전달용)
    private String customerName;           // 1) 고객사
    private String projectName;            // 2) 사업명
    private Long totalAmount;              // 3) 사업금액
    private LocalDate startDate;           // 4) 사업개시일
    private LocalDate endDate;             // 5) 사업완료일
    private String pmName;                 // 6) PM 이름
    private String salesRepresentativeName;// 7) 영업대표
    private boolean hasResultReport;       // 결과보고서 등록 여부 (버튼 분기용)

    public static ProjectListResponse from(Project project) {
        // 1. 고객사명 추출 (수주보고서 -> 최종고객사)
        String customer = (project.getOrderReport() != null && project.getOrderReport().getFinalCustomerCompany() != null)
                ? project.getOrderReport().getFinalCustomerCompany().getName() : null;

        // 2. PM 이름 추출 (Project의 manager가 우선, 없으면 수주보고서의 PM)
        String pm = (project.getManager() != null)
                ? project.getManager().getName()
                : (project.getOrderReport() != null && project.getOrderReport().getPm() != null
                        ? project.getOrderReport().getPm().getName() : null);

        // 3. 영업대표 이름 추출 (Project에 저장된 영업대표 스냅샷 사용)
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