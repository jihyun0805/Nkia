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
    GN_MA("GN-MA", ProjectType.MAINTENANCE),
    GE_MA("GE-MA", ProjectType.MAINTENANCE),
    GL_MA("GL-MA", ProjectType.MAINTENANCE),
    MN_MA("MN-MA", ProjectType.MAINTENANCE),
    ME_MA("ME-MA", ProjectType.MAINTENANCE),
    ML_MA("ML-MA", ProjectType.MAINTENANCE),
    
    // 3. 용역
    SERVICE("용역", ProjectType.SERVICE),;

    private final String value;       // 실제 사업 코드
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