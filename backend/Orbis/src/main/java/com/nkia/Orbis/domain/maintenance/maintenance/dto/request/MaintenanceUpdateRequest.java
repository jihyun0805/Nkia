package com.nkia.Orbis.domain.maintenance.maintenance.dto.request;

import com.nkia.Orbis.domain.maintenance.maintenance.entity.Importance;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.InspectionCycle;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.MaintenanceType;
import com.nkia.Orbis.domain.maintenance.maintenance.entity.ProdFamily;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class MaintenanceUpdateRequest {

    private UUID salesRep;              // 영업 (user)

    private UUID managerPrimary;        // 변경(정) 담당자

    private UUID managerSecondary;      // 변경(부) 담당자

    private String category;            // 구분

    private boolean isRemote;           // 원격 여부

    private InspectionCycle inspectionCycle;     // 점검주기

    private Importance importance;          // 중요도

    private MaintenanceType type;       // 유무상 (FREE, PAID)

    private String location;            // 위치

    private Double rate;                // 요율

    private Long contractAmount;        // 계약금액

    private Long annualAmount;          // 연간 유지보수 금액

    private LocalDate contractDate;     // 계약일

    private LocalDate startDate;        // 시작일

    private LocalDate endDate;          // 종료일

    private boolean reportSubmitted;    // 보고서제출여부

    private UUID regularPm;             // 정기PM

    private ProdFamily productFamily;   // 제품군

    private String apVersion;           // AP버전

    private boolean aclPatchStatus;     // ACL패치여부

    private boolean vulnPatchStatus;    // 모니터템플릿 취약점 패치여부

    private String upgradePlan;         // LTS 8.4.0 업그레이드 계획

    private Integer apCount;            // AP수

    private Integer esCount;            // ES수

    private String esVersion;           // ES버전

    private boolean dbHaStatus;         // DB HA

    private String dbVersion;           // DB 버전

    private String remarks;             // 비고

    private Long contractFileId;        // 계약서 첨부파일 ID
}
