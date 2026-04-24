export type MaintenanceCategory = "free" | "paid" | "support"

export const freeMaintenances = [
  { id: "FMA-2026-001", contractId: "CON-2026-001", customer: "농협은행", product: "EMS Enterprise", startDate: "2026-07-01", endDate: "2027-06-30", manager: "김유지", subManager: "박지원", daysRemaining: 450, status: "진행중" },
  { id: "FMA-2026-002", contractId: "CON-2026-002", customer: "우리은행", product: "Automation Suite", startDate: "2026-06-01", endDate: "2027-05-31", manager: "이보수", subManager: "최담당", daysRemaining: 419, status: "진행중" },
  { id: "FMA-2025-015", contractId: "CON-2025-015", customer: "신한은행", product: "ITSM Pro", startDate: "2025-03-01", endDate: "2026-02-28", manager: "정관리", subManager: "-", daysRemaining: 0, status: "종료" },
]

export const paidMaintenances = [
  { id: "PMA-2026-001", customer: "신한은행", product: "ITSM Pro", startDate: "2026-03-01", endDate: "2027-02-28", amount: "30,000,000", manager: "정관리", progress: "계약체결", status: "진행중" },
  { id: "PMA-2025-008", customer: "삼성SDS", product: "EMS Standard", startDate: "2025-06-01", endDate: "2026-05-31", amount: "25,000,000", manager: "김유지", progress: "계약체결", status: "종료예정" },
  { id: "PMA-2025-012", customer: "LG전자", product: "EMS Enterprise", startDate: "2025-09-01", endDate: "2026-08-31", amount: "45,000,000", manager: "이보수", progress: "견적서전달", status: "미체결" },
]

export const customerSupports = [
  { id: "SUP-2026-0125", date: "2026-03-17", customer: "농협은행", type: "정기", content: "3월 정기 점검", hours: 4, manager: "김유지", supporter: "-", status: "완료" },
  { id: "SUP-2026-0126", date: "2026-03-16", customer: "신한은행", type: "장애", content: "에이전트 연결 장애 대응", hours: 2, manager: "정관리", supporter: "연구소 홍길동", status: "완료" },
  { id: "SUP-2026-0127", date: "2026-03-18", customer: "삼성SDS", type: "고객요청", content: "신규 모니터링 대상 추가", hours: 3, manager: "김유지", supporter: "-", status: "예정" },
]

export function getMaintenanceCategoryLabel(category: MaintenanceCategory) {
  if (category === "free") return "무상유지보수"
  if (category === "paid") return "유상유지보수"
  return "고객지원"
}

export function getMaintenanceItem(category: MaintenanceCategory, id: string) {
  if (category === "free") return freeMaintenances.find((item) => item.id === id) ?? null
  if (category === "paid") return paidMaintenances.find((item) => item.id === id) ?? null
  return customerSupports.find((item) => item.id === id) ?? null
}

export function getMaintenanceFields(category: MaintenanceCategory, item: any) {
  if (category === "free") return [
    { label: "유지보수번호", value: item.id },
    { label: "계약번호", value: item.contractId },
    { label: "고객사", value: item.customer },
    { label: "제품", value: item.product },
    { label: "시작일", value: item.startDate },
    { label: "종료일", value: item.endDate },
    { label: "정담당자", value: item.manager },
    { label: "부담당자", value: item.subManager },
    { label: "잔여일", value: String(item.daysRemaining) },
    { label: "상태", value: item.status },
  ]
  if (category === "paid") return [
    { label: "유지보수번호", value: item.id },
    { label: "고객사", value: item.customer },
    { label: "제품", value: item.product },
    { label: "시작일", value: item.startDate },
    { label: "종료일", value: item.endDate },
    { label: "계약금액", value: item.amount },
    { label: "담당자", value: item.manager },
    { label: "진행상태", value: item.progress },
    { label: "상태", value: item.status },
  ]
  return [
    { label: "지원번호", value: item.id },
    { label: "지원일", value: item.date },
    { label: "고객사", value: item.customer },
    { label: "유형", value: item.type },
    { label: "내용", value: item.content },
    { label: "소요시간", value: `${item.hours}시간` },
    { label: "담당자", value: item.manager },
    { label: "지원인력", value: item.supporter },
    { label: "상태", value: item.status },
  ]
}
