export type ProjectCategory = "results" | "billingAndCollection" | "revenue"

export const projectResults = [
  { id: "PRJ-2026-001", contractId: "CON-2026-001", name: "농협은행 통합 모니터링 시스템", customer: "농협은행", amount: 150000000, startDate: "2026-03-15", endDate: "2026-06-30", pm: "정PM", salesRep: "김영업", registeredAt: "2026-06-30" },
  { id: "PRJ-2026-002", contractId: "CON-2026-002", name: "우리은행 자동화 시스템", customer: "우리은행", amount: 175000000, startDate: "2026-03-01", endDate: "2026-05-31", pm: "최PM", salesRep: "이영업", registeredAt: "2026-06-01" },
  { id: "PRJ-2025-015", contractId: "CON-2025-015", name: "신한은행 ITSM 구축", customer: "신한은행", amount: 200000000, startDate: "2025-10-01", endDate: "2026-02-28", pm: "박PM", salesRep: "최영업", registeredAt: "2026-03-05" },
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

export const billingAndCollections = [
  { id: "BNC-2026-001", customer: "농협은행", projectName: "농협은행 통합 모니터링 시스템", amount: "90,000,000", issueDate: "2026-03-20", collectionDate: "-", salesRep: "김영업", requester: "박담당", approvalStatus: "승인완료", registeredAt: "2026-03-15" },
  { id: "BNC-2026-002", customer: "우리은행", projectName: "우리은행 자동화 시스템", amount: "75,000,000", issueDate: "2026-03-05", collectionDate: "2026-04-03", salesRep: "이영업", requester: "최담당", approvalStatus: "승인완료", registeredAt: "2026-03-01" },
  { id: "BNC-2026-003", customer: "우리은행", projectName: "우리은행 자동화 시스템", amount: "100,000,000", issueDate: "2026-03-25", collectionDate: "-", salesRep: "이영업", requester: "최담당", approvalStatus: "진행중", registeredAt: "2026-03-20" },
  { id: "BNC-2026-004", customer: "신한은행", projectName: "신한은행 ITSM 구축", amount: "50,000,000", issueDate: "2026-04-10", collectionDate: "-", salesRep: "최영업", requester: "이담당", approvalStatus: "승인완료", registeredAt: "2026-04-05" },
]

export const expectedRevenue = [
  { month: "2026-01", ems: 150000000, itsm: 80000000, automation: 50000000, wss: 20000000 },
  { month: "2026-02", ems: 200000000, itsm: 120000000, automation: 70000000, wss: 30000000 },
  { month: "2026-03", ems: 180000000, itsm: 100000000, automation: 90000000, wss: 25000000 },
  { month: "2026-04", ems: 250000000, itsm: 150000000, automation: 80000000, wss: 40000000 },
]

export function getProjectCategoryLabel(category: ProjectCategory) {
  if (category === "results") return "결과보고"
  if (category === "billingAndCollection") return "청구 및 수금 현황"
  return "예상 매출액"
}

export function getProjectItem(category: ProjectCategory, id: string) {
  if (category === "results") return projectResults.find((item) => item.id === id) ?? null
  if (category === "billingAndCollection") return billingAndCollections.find((item) => item.id === id) ?? null
  return null
}

export function getProjectFields(category: ProjectCategory, item: any) {
  if (category === "results") return [
    { label: "사업번호", value: item.id },
    { label: "고객사", value: item.customer },
    { label: "사업명", value: item.name },
    { label: "사업금액", value: `₩${item.amount.toLocaleString()}` },
    { label: "사업개시일", value: item.startDate },
    { label: "사업완료일", value: item.endDate },
    { label: "PM 이름", value: item.pm },
    { label: "영업대표", value: item.salesRep },
  ]
  if (category === "billingAndCollection") return [
    { label: "관리번호", value: item.id },
    { label: "고객사", value: item.customer },
    { label: "사업명", value: item.projectName },
    { label: "청구금액", value: item.amount },
    { label: "발행일", value: item.issueDate },
    { label: "수금일", value: item.collectionDate },
    { label: "영업대표", value: item.salesRep },
    { label: "요청자", value: item.requester },
    { label: "결재상태", value: item.approvalStatus },
  ]
  return []
}
