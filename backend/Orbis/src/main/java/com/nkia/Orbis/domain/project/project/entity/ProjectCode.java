package com.nkia.Orbis.domain.project.project.entity;

import com.nkia.Orbis.common.exception.ApiException;
import com.nkia.Orbis.common.exception.errorcode.ProjectErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ProjectCode {
    // 1. 솔루션 (Solution)
    GN("GN", ProjectType.SOLUTION),
    GA("GA", ProjectType.SOLUTION),
    JN("JN", ProjectType.SOLUTION),
    JA("JA", ProjectType.SOLUTION),
    MN("MN", ProjectType.SOLUTION),
    MA("MA", ProjectType.SOLUTION),

    // 2. 유지보수 (Maintenance)
    GNMA("GN-MA", ProjectType.MAINTENANCE),
    GEMA("GE-MA", ProjectType.MAINTENANCE),
    GLMA("GL-MA", ProjectType.MAINTENANCE),
    MNMA("MN-MA", ProjectType.MAINTENANCE),
    MEMA("ME-MA", ProjectType.MAINTENANCE),
    MLMA("ML-MA", ProjectType.MAINTENANCE),
    
    SERVICE("용역", ProjectType.SERVICE),;

    private final String value;
    private final ProjectType type;

    public static ProjectCode fromValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(ProjectErrorCode.INVALID_PROJECT_CODE);
        }

        for (ProjectCode code : ProjectCode.values()) {
            if (code.getValue().equals(value)) {
                return code;
            }
        }
        throw new ApiException(ProjectErrorCode.INVALID_PROJECT_CODE);
    }
}