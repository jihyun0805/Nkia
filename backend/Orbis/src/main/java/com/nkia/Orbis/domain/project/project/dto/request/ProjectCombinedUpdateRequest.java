package com.nkia.Orbis.domain.project.project.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectCombinedUpdateRequest {

    private LocalDate startDate;

    private LocalDate endDate;

    @NotNull(message = "담당 PM 지정은 필수입니다.")
    private UUID managerId;

    @NotNull(message = "영업대표 지정은 필수입니다.")
    private UUID salesRepresentativeId;

    private Long fileId;
}