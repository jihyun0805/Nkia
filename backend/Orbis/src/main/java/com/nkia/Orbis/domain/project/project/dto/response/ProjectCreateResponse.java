package com.nkia.Orbis.domain.project.project.dto.response;

import com.nkia.Orbis.domain.project.project.entity.Project;
import com.nkia.Orbis.domain.project.project.entity.ProjectType;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectCreateResponse {
    private Long id;
    private String pjtNumber;
    private String pjtName;
    private ProjectType type;
    private Long totalAmount;
    private String customerName;
    private String salesRepresentativeName;
    private LocalDateTime createdAt;

    public static ProjectCreateResponse from(Project project) {
        String customer = (project.getOrderReport() != null && project.getOrderReport().getFinalCustomerCompany() != null)
                ? project.getOrderReport().getFinalCustomerCompany().getName() : null;

        return ProjectCreateResponse.builder()
                .id(project.getId())
                .pjtNumber(project.getPjtNumber())
                .pjtName(project.getPjtName())
                .type(project.getType())
                .totalAmount(project.getTotalAmount())
                .customerName(customer)
                .salesRepresentativeName(project.getSalesRepresentative() != null ? project.getSalesRepresentative().getName() : null)
                .createdAt(project.getCreatedAt())
                .build();
    }
}
