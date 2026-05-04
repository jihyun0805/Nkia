package com.nkia.Orbis.domain.maintenance.maintenance.dto.request;

import com.nkia.Orbis.domain.maintenance.maintenance.entity.Importance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.InspectionCycle;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MaintenanceCreateRequest {

    // 1. 기본 및 연관 정보 (상속 필드)
    @NotNull(message = "사업(PJT) ID는 필수입니다.")
    private Long projectId;             // PJT id

    @NotNull(message = "영업대표 정보는 필수입니다.")
    private UUID salesRepId;          // 영업 (user id)

    // 2. 담당자 정보
    private UUID managerPrimary;      // 변경(정) - 주 담당자
    private UUID managerSecondary;    // 변경(부) - 부 담당자

    // 3. 계약 및 비용 정보
    private String category;            // 구분 (예: 공공, 금융 등)

    @NotNull(message = "유지보수 타입(유상/무상)은 필수입니다.")
    private MaintenanceType maintenanceType;     // 유무상 (FREE / PAID)

    private Long contractAmount;        // 계약금액
    private Long annualMaintenanceAmount; // 연간 유지보수 금액
    private Double maintenanceRate;     // 요율
    private LocalDate contractDate;     // 계약일
    private LocalDate startDate;        // 시작일
    private LocalDate endDate;          // 종료일

    // 4. 점검 및 운영 정보
    private boolean remoteAvailable;    // 원격 여부
    private InspectionCycle inspectionCycle;     // 점검주기
    private Importance importance;      // 중요도
    private String location;            // 위치
    private boolean reportSubmission;   // 보고서제출여부
    private UUID regularPm;             // 정기PM

    // 5. 기술 환경 정보 (Technical Specs)
    private String productFamily;       // 제품군
    private String apVersion;           // AP버전
    private Integer apCount;            // AP수
    private String esVersion;           // ES버전
    private Integer esCount;            // ES수
    private String dbVersion;           // DB 버전
    private boolean dbHaStatus;         // DB HA (고가용성 여부)

    // 6. 패치 및 업데이트 관리
    private boolean aclPatchStatus;     // ACL패치여부
    private boolean vulnerabilityPatch;  // 모니터템플릿 취약점 패치여부
    private String ltsUpgradePlan;      // LTS 8.4.0 업그레이드 계획

    private String remarks;             // 비고
}