# 입찰 도메인 워크플로우 통합 계획

> 작성: 2026-05-21 · brand `feat/bid-workflow-integration`
> 목표: RFP 분석 / 제안서 에 결재(상신·승인·반려·취소) 시스템 부착

---

## 1. 현황 분석

### 1-1. WorkflowDomain enum (현재 13개 도메인)

이미 등록: QUOTATION, MAINTENANCE_QUOTATION, ORDER_REPORT, CONTRACT, PURCHASE_CONTRACT,
FREE_MAINTENANCE_CONTRACT, PAID_MAINTENANCE_CONTRACT, LICENSE, BILLING, CUSTOMER_SUPPORT,
**PRB, PRB_RESULT, BID_RESULT**

→ 입찰 도메인 중 **PRB·PrbResult·BidResult 는 이미 결재 통합 완료**.

### 1-2. Handler 적용 현황 (`domain/admin/workflow/handler/`)

```
✅  BidResultHandler        BillingHandler        ContractHandler
    CustomerSupportHandler  FreeMaintenanceHandler LicenseHandler
    MaintenanceQuotationHandler  OrderReportHandler  PaidMaintenanceHandler
    PrbHandler  PrbResultHandler  QuotationHandler
❌  RfpAnalyzeResultHandler  ← 없음
❌  ProposalHandler           ← 없음
```

### 1-3. 도메인별 상세 — 입찰 단계

| 도메인 | Workflow Handler | submit endpoint | 결재 enum | 작업 필요? |
|---|---|---|---|---|
| RFP 분석 (`rfp_analyze_result`) | ❌ | ❌ | `RfpStatus` (RECEIVED 등 — 결재 enum 아님) | **YES — 전부 신규** |
| 제안서 (`proposal`) | ❌ | ❌ | `ProposalStatus` (IN_PROGRESS/COMPLETED — 결재 enum 아님) | **YES — 결재 enum 추가 + Handler·submit 추가** |
| PRB | ✅ | ✅ `POST /prbs/submit/{prbId}` | ApprovalStatus | — |
| PRB 결과 | ✅ | ✅ `POST /prb-results/submit/{prbResultId}` | ApprovalStatus | — |
| 입찰 결과 | ✅ | ✅ `POST /bid-results/submit/{bidResultId}` | ApprovalStatus | — |

---

## 2. Reference 패턴 — `OrderReport` 가 워크플로우와 어떻게 묶이는지

5개 레이어로 구성됨 (이 그대로 RFP / Proposal 에 적용):

### Layer 1 — Entity (`OrderReport.java`)

```java
@Enumerated(EnumType.STRING)
private ApprovalStatus status = ApprovalStatus.DRAFT;

public void submit()  { this.status = ApprovalStatus.PENDING;  }
public void approve() { this.status = ApprovalStatus.APPROVED; }
public void reject()  { this.status = ApprovalStatus.REJECTED; }
public void cancel()  { this.status = ApprovalStatus.CANCELED; }
```

### Layer 2 — Controller (`OrderReportController.java`)

```java
@PostMapping("/submit/{orderReportId}")
public ResponseEntity<ApiResponse<Void>> submit(
        @PathVariable Long orderReportId,
        @Valid @RequestBody SubmitRequest req) {
    orderReportService.submit(orderReportId, req.firstApproverId());
    return ResponseEntity.ok(ApiResponse.success(null));
}
```

### Layer 3 — Service

```java
public void submit(Long id, UUID firstApproverId) {
    OrderReport entity = repository.findById(id).orElseThrow(...);
    entity.submit();                                  // status = PENDING
    workflowService.start(WorkflowDomain.ORDER_REPORT, id, requesterId, firstApproverId);
}
```

### Layer 4 — Handler (`OrderReportHandler implements WorkflowDomainHandler`)

```java
@Override
public WorkflowDomain getDomain() { return WorkflowDomain.ORDER_REPORT; }

@Override
public void onApproved(Long targetId) {
    OrderReport o = repo.findById(targetId).orElseThrow(...);
    o.approve();
    projectService.createProjectFromOrderReport(o);  // 도메인별 후속 작업 (선택)
}

@Override public void onRejected(Long targetId)  { ... cancel(): ... }
@Override public void onCancelled(Long targetId) { ... }
```

### Layer 5 — WorkflowDomain enum 등록

```java
public enum WorkflowDomain {
    ...
    BID_RESULT("입찰 결과");
}
```

---

## 3. 작업 계획

### 3-1. RFP 분석 결재 통합 (큰 작업 — entity 까지 손대야 함)

| # | 파일 | 작업 |
|---|---|---|
| 1 | `WorkflowDomain.java` | enum 추가 `RFP_ANALYZE_RESULT("RFP 분석")` |
| 2 | `RfpAnalyzeResult.java` | `@Enumerated ApprovalStatus approvalStatus = DRAFT` 필드 추가 (기존 `status` 는 진행 상태로 유지 / 결재 status 와 분리) + `submit/approve/reject/cancel` 메서드 |
| 3 | `RfpAnalyzeResultCreateRequest.java` / `Service.toEntity` | 초기 `approvalStatus = DRAFT` 세팅 |
| 4 | `RfpAnalyzeResultController.java` | `POST /rfp-analyze-results/submit/{id}` endpoint 추가 |
| 5 | `RfpAnalyzeResultService.java` | `submit(id, firstApproverId)` — entity.submit() + workflowService.start() |
| 6 | `RfpAnalyzeResultHandler.java` 신규 | WorkflowDomainHandler 구현, onApproved/onRejected/onCancelled |
| 7 | `RfpAnalyzeResultDetailResponse` | `approvalStatus` 필드 노출 (frontend 가 결재 패널 표시할 수 있게) |
| 8 | DB migration | `ALTER TABLE rfp_analyze_result ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'` |
| 9 | autoseed v2 | RFP 시드 시 submit 후 결재 분포 (1/3 완료, 1/3 PENDING, 1/3 DRAFT) |
| 10 | frontend `rfp-analysis-sheet.tsx` | WorkflowApprovalPanel 컴포넌트 import + 상신/승인 UI |
| 11 | AI `ChatbotUserContextService` | `WorkflowDomain.RFP_ANALYZE_RESULT` permission 매핑 |

**onApproved 의 side-effect 결정 필요** — RFP 분석 승인 시 무엇이 트리거되나? (없으면 단순 status 전이만)

### 3-2. 제안서 결재 통합 (중간 작업 — enum 만 별도, 나머지는 RFP 와 동일)

| # | 파일 | 작업 |
|---|---|---|
| 1 | `WorkflowDomain.java` | enum 추가 `PROPOSAL("제안서")` |
| 2 | `Proposal.java` | `@Enumerated ApprovalStatus approvalStatus = DRAFT` 추가. 기존 `ProposalStatus`(IN_PROGRESS/COMPLETED) 는 작성 진행 상태로 유지 (별도 의미) |
| 3 | `ProposalCreateRequest` | 초기 `approvalStatus = DRAFT` |
| 4 | `ProposalController` | `POST /proposals/submit/{id}` |
| 5 | `ProposalService` | `submit(id, firstApproverId)` |
| 6 | `ProposalHandler` 신규 | onApproved 시 — 후속 액션 결정 필요 (예: 입찰 단계 전환?) |
| 7 | `ProposalDetailResponse` | `approvalStatus` 노출 |
| 8 | DB migration | `ALTER TABLE proposal ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'` |
| 9 | autoseed v2 | proposal 결재 분포 |
| 10 | frontend `proposal-registration-form.tsx` | WorkflowApprovalPanel 추가 |
| 11 | AI permission | `WorkflowDomain.PROPOSAL` 매핑 |

---

## 4. 결정 필요 사항 (담당자 협의)

1. **결재 단계 — 2단계 vs 3단계?**
   - 현재 패턴: 라이선스/청구/고객지원 = 3단계 (member→leader→director), 그 외 = 2단계 (leader→director)
   - RFP 분석 / 제안서는 보통 **2단계** (다른 영업 단계와 통일)

2. **승인 시 side-effect 가 있나?**
   - OrderReport: 승인 시 Project 자동 생성
   - RFP 분석 승인: ??? (제안서 작성 단계 자동 전환?)
   - 제안서 승인: ??? (입찰 결과 단계 자동 전환?)
   - 없으면 단순 status 전이만

3. **기존 `RfpStatus` / `ProposalStatus` 와 새 `ApprovalStatus` 의 의미 분리**
   - `RfpStatus` = 분석 진행 상태 (RECEIVED → IN_PROGRESS → COMPLETED)
   - `ApprovalStatus` = 결재 상태 (DRAFT → PENDING → APPROVED/REJECTED/CANCELED)
   - **두 status 가 독립** — UI 에 둘 다 표시. 결재 PENDING 중에도 분석 진행 가능 등.

4. **DB migration 시점**
   - Hibernate `ddl-auto: update` 가 NOT NULL DEFAULT 컬럼 추가는 OK
   - 또는 Flyway migration 으로 명시적 SQL

5. **AI 챗봇 통합**
   - "RFP 분석 결재 대기 목록" 같은 질의 지원 필요한지 — Yes 면 ChatbotUserContextService 매핑 + AI domain_registry 등록

---

## 5. 작업 순서 (PR 단위)

**PR 1 — RFP 분석 워크플로우 통합** (백엔드 + DB + autoseed)
- 위 §3-1 의 1~9
- 검증: admin token 으로 RFP 생성 → submit → my workflows → approve → status=APPROVED

**PR 2 — RFP 분석 frontend** (UI 패널)
- §3-1 의 10
- 검증: 브라우저에서 결재 상신/승인/반려 동작

**PR 3 — 제안서 워크플로우 통합** (백엔드 + DB + autoseed)
- §3-2 의 1~9

**PR 4 — 제안서 frontend**
- §3-2 의 10

**PR 5 — AI 챗봇 통합** (optional)
- §3-1 의 11, §3-2 의 11
- chatbot 이 "RFP 결재 대기 N건" 같은 질의 처리 가능

각 PR 은 mergeable + revertable 단위. PR 1 + 2 가 의존, PR 3 + 4 가 의존, PR 5 는 독립.

---

## 6. 영향 / 리스크

| 항목 | 영향 | 완화 |
|---|---|---|
| Hibernate ddl-auto | NOT NULL DEFAULT 'DRAFT' 추가 — 기존 row 도 DRAFT 로 채워짐 | OK (기존 데이터 결재 안 거친 상태로 표시) |
| 기존 frontend | RFP·Proposal 페이지 미수정 시에도 백엔드 정상 (status 필드 추가만) | PR 1·3 머지 후 frontend PR 2·4 |
| autoseed | 새 컬럼 채우지 않으면 DRAFT 로 시드. 결재 분포 다양화하려면 PR 1·3 의 §3-1/2 작업 9 필수 | autoseed v2 의 seeders.py 패치 |
| AI 챗봇 | permission 매핑 안 하면 새 도메인이 챗봇 검색에서 누락 | PR 5 |

---

## 7. 예상 코드 변경 규모

- backend: 11 + 11 = 22 파일 (entity 2 + service 2 + controller 2 + handler 2 신규 + DTO 4 + enum 1 + migration 2)
- frontend: 2 파일 (각 sheet)
- autoseed: seeders.py 의 RFP/Proposal 부분
- AI: ChatbotUserContextService + domain_registry 1줄씩

총 라인 추가 추정 **~400라인**, 변경 ~50라인.
