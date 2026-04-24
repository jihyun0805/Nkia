export type ProjectCategory = "results" | "billing" | "collection"

export const projectResults = [
  { id: "PRJ-2026-001", contractId: "CON-2026-001", name: "농협은행 통합 모니터링 시스템", customer: "농협은행", pm: "정PM", startDate: "2026-03-15", endDate: "2026-06-30", progress: 45, status: "진행중", issues: "일정 정상 진행" },
  { id: "PRJ-2026-002", contractId: "CON-2026-002", name: "우리은행 자동화 시스템", customer: "우리은행", pm: "최PM", startDate: "2026-03-01", endDate: "2026-05-31", progress: 70, status: "진행중", issues: "고객 요청 추가 기능 협의 중" },
  { id: "PRJ-2025-015", contractId: "CON-2025-015", name: "신한은행 ITSM 구축", customer: "신한은행", pm: "박PM", startDate: "2025-10-01", endDate: "2026-02-28", progress: 100, status: "완료", issues: "-" },
]

export const billings = [
  { id: "BIL-2026-001", projectId: "PRJ-2026-001", customer: "농협은행", type: "선급금", amount: "90,000,000", issueDate: "2026-03-20", dueDate: "2026-04-20", invoiceNo: "INV-2026-0315", status: "발행완료" },
  { id: "BIL-2026-002", projectId: "PRJ-2026-002", customer: "우리은행", type: "선급금", amount: "75,000,000", issueDate: "2026-03-05", dueDate: "2026-04-05", invoiceNo: "INV-2026-0287", status: "수금완료" },
  { id: "BIL-2026-003", projectId: "PRJ-2026-002", customer: "우리은행", type: "중도금", amount: "100,000,000", issueDate: "2026-03-25", dueDate: "2026-04-25", invoiceNo: "INV-2026-0342", status: "발행완료" },
]

export const collections = [
  { id: "COL-2026-001", billingId: "BIL-2026-002", customer: "우리은행", amount: "75,000,000", dueDate: "2026-04-05", collectedDate: "2026-04-03", method: "계좌이체", status: "수금완료" },
  { id: "COL-2026-002", billingId: "BIL-2026-001", customer: "농협은행", amount: "90,000,000", dueDate: "2026-04-20", collectedDate: "-", method: "-", status: "대기" },
]

export const expectedRevenue = [
  { month: "2026-01", ems: 150000000, itsm: 80000000, automation: 50000000, wss: 20000000 },
  { month: "2026-02", ems: 200000000, itsm: 120000000, automation: 70000000, wss: 30000000 },
  { month: "2026-03", ems: 180000000, itsm: 100000000, automation: 90000000, wss: 25000000 },
  { month: "2026-04", ems: 250000000, itsm: 150000000, automation: 80000000, wss: 40000000 },
]

export function getProjectCategoryLabel(category: ProjectCategory) {
  if (category === "results") return "결과보고"
  if (category === "billing") return "청구"
  return "수금"
}

export function getProjectItem(category: ProjectCategory, id: string) {
  if (category === "results") return projectResults.find((item) => item.id === id) ?? null
  if (category === "billing") return billings.find((item) => item.id === id) ?? null
  return collections.find((item) => item.id === id) ?? null
}

export function getProjectFields(category: ProjectCategory, item: any) {
  if (category === "results") return [
    { label: "사업번호", value: item.id },
    { label: "계약번호", value: item.contractId },
    { label: "사업명", value: item.name },
    { label: "고객사", value: item.customer },
    { label: "PM", value: item.pm },
    { label: "시작일", value: item.startDate },
    { label: "종료일", value: item.endDate },
    { label: "진행률", value: `${item.progress}%` },
    { label: "상태", value: item.status },
    { label: "이슈", value: item.issues },
  ]
  if (category === "billing") return [
    { label: "청구번호", value: item.id },
    { label: "사업번호", value: item.projectId },
    { label: "고객사", value: item.customer },
    { label: "청구유형", value: item.type },
    { label: "청구금액", value: item.amount },
    { label: "발행일", value: item.issueDate },
    { label: "납기일", value: item.dueDate },
    { label: "세금계산서", value: item.invoiceNo },
    { label: "상태", value: item.status },
  ]
  return [
    { label: "수금번호", value: item.id },
    { label: "청구번호", value: item.billingId },
    { label: "고객사", value: item.customer },
    { label: "수금금액", value: item.amount },
    { label: "납기일", value: item.dueDate },
    { label: "수금일", value: item.collectedDate },
    { label: "수금방법", value: item.method },
    { label: "상태", value: item.status },
  ]
}
