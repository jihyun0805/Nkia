export type MaintenanceCategory = "free" | "paid" | "support"

export const freeMaintenances = [
  { id: "FMA-2026-001", contractId: "CON-2026-001", customer: "농협은행", opportunity: "농협은행 통합 모니터링 시스템", product: "EMS Enterprise", amount: "300,000,000", startDate: "2026-07-01", endDate: "2027-06-30", salesRep: "김영업", manager: "김유지", subManager: "박지원", daysRemaining: 450, status: "진행중", registeredAt: "2026-03-10T10:00:00Z" },
  { id: "FMA-2026-002", contractId: "CON-2026-002", customer: "우리은행", opportunity: "우리은행 자동화 시스템", product: "Automation Suite", amount: "250,000,000", startDate: "2026-06-01", endDate: "2027-05-31", salesRep: "박과장", manager: "이보수", subManager: "최담당", daysRemaining: 419, status: "진행중", registeredAt: "2026-02-25T14:30:00Z" },
  { id: "FMA-2025-015", contractId: "CON-2025-015", customer: "신한은행", opportunity: "신한은행 ITSM 고도화", product: "ITSM Pro", amount: "150,000,000", startDate: "2025-03-01", endDate: "2026-02-28", salesRep: "이대리", manager: "정관리", subManager: "-", daysRemaining: 0, status: "종료", registeredAt: "2025-02-15T09:15:00Z" },
]

export const paidMaintenances = [
  { id: "PMA-2026-001", customer: "신한은행", opportunity: "신한은행 ITSM 유지보수 재계약", product: "ITSM Pro", startDate: "2026-03-01", endDate: "2027-02-28", amount: "30,000,000", inspectionMethod: "월 정기점검", salesRep: "이대리", manager: "정관리", progress: "계약체결", status: "진행중", registeredAt: "2026-02-20T10:00:00Z" },
  { id: "PMA-2025-008", customer: "삼성SDS", opportunity: "삼성SDS EMS 운영지원", product: "EMS Standard", startDate: "2025-06-01", endDate: "2026-05-31", amount: "25,000,000", inspectionMethod: "분기 정기점검", salesRep: "김영업", manager: "김유지", progress: "계약체결", status: "종료예정", registeredAt: "2025-05-15T14:30:00Z" },
  { id: "PMA-2025-012", customer: "LG전자", opportunity: "LG전자 통합 모니터링 고도화 유지보수", product: "EMS Enterprise", startDate: "2025-09-01", endDate: "2026-08-31", amount: "45,000,000", inspectionMethod: "원격 정기점검", salesRep: "박과장", manager: "이보수", progress: "견적서전달", status: "미체결", registeredAt: "2025-08-10T09:15:00Z" },
]

export const customerSupports = [
  { id: "SUP-2026-0125", date: "2026-03-17", customer: "농협은행", type: "정기", content: "3월 정기 점검", hours: 4, manager: "김유지", supporter: "-", status: "완료" },
  { id: "SUP-2026-0126", date: "2026-03-16", customer: "신한은행", type: "장애", content: "에이전트 연결 장애 대응", hours: 2, manager: "정관리", supporter: "연구소 홍길동", status: "완료" },
  { id: "SUP-2026-0127", date: "2026-03-18", customer: "삼성SDS", type: "고객요청", content: "신규 모니터링 대상 추가", hours: 3, manager: "김유지", supporter: "-", status: "예정" },
]

export const supportHistories = [
  {
    id: "REQ-2026-001",
    recordType: "request", // "request" | "result"
    customer: "농협은행",
    requestType: "-", // For results: request code or "정기점검"
    startDate: "2026-03-20 09:00",
    endDate: "2026-03-20 18:00",
    requester: "테크센터 담당자",
    registrant: "-",
    salesRep: "김영업",
    supportRep: "김유지",
    registeredAt: "2026-03-19T10:00:00Z"
  },
  {
    id: "RES-2026-001",
    recordType: "result",
    customer: "농협은행",
    requestType: "REQ-2026-001",
    startDate: "2026-03-20 09:00",
    endDate: "2026-03-20 18:00",
    requester: "-",
    registrant: "김유지",
    salesRep: "-",
    supportRep: "-",
    registeredAt: "2026-03-20T18:30:00Z"
  },
  {
    id: "RES-2026-002",
    recordType: "result",
    customer: "신한은행",
    requestType: "정기점검",
    startDate: "2026-03-15 10:00",
    endDate: "2026-03-15 12:00",
    requester: "-",
    registrant: "정관리",
    salesRep: "-",
    supportRep: "-",
    registeredAt: "2026-03-15T13:00:00Z"
  },
  {
    id: "REQ-2026-002",
    recordType: "request",
    customer: "삼성SDS",
    requestType: "-",
    startDate: "2026-03-25 14:00",
    endDate: "2026-03-25 18:00",
    requester: "삼성SDS 인프라팀",
    registrant: "-",
    salesRep: "김영업",
    supportRep: "김유지",
    registeredAt: "2026-03-21T09:15:00Z"
  }
];


export function getMaintenanceCategoryLabel(category: MaintenanceCategory) {
  if (category === "free") return "무상유지보수"
  if (category === "paid") return "유상유지보수"
  return "고객지원"
}

export function getMaintenanceItem(category: MaintenanceCategory, id: string) {
  if (category === "free") return freeMaintenances.find((item) => item.id === id) ?? null
  if (category === "paid") return paidMaintenances.find((item) => item.id === id) ?? null
  return supportHistories.find((item) => item.id === id) ?? null
}

export function getMaintenanceFields(category: MaintenanceCategory, item: any) {
  if (category === "free") return [
    { label: "유지보수번호", value: item.id },
    { label: "계약번호", value: item.contractId },
    { label: "고객사", value: item.customer },
    { label: "사업기회", value: item.opportunity },
    { label: "제품", value: item.product },
    { label: "계약금액", value: item.amount },
    { label: "계약개시일", value: item.startDate },
    { label: "계약종료일", value: item.endDate },
    { label: "영업대표", value: item.salesRep },
    { label: "유지보수 담당자", value: item.manager },
    { label: "상태", value: item.status },
  ]
  if (category === "paid") return [
    { label: "유지보수번호", value: item.id },
    { label: "고객사", value: item.customer },
    { label: "사업기회", value: item.opportunity },
    { label: "제품", value: item.product },
    { label: "계약금액", value: item.amount },
    { label: "계약개시일", value: item.startDate },
    { label: "계약종료일", value: item.endDate },
    { label: "점검 방법", value: item.inspectionMethod },
    { label: "영업대표", value: item.salesRep },
    { label: "유지보수 담당자", value: item.manager },
    { label: "진행상태", value: item.progress },
    { label: "상태", value: item.status },
  ]
  return [
    { label: "번호", value: item.id },
    { label: "구분", value: item.recordType === "request" ? "지원 요청" : "활동 결과" },
    { label: "고객사", value: item.customer },
    { label: "요청/활동구분", value: item.recordType === "request" ? "-" : item.requestType },
    { label: "개시일시", value: item.startDate },
    { label: "완료일시", value: item.endDate },
    { label: "요청/등록자", value: item.recordType === "request" ? item.requester : item.registrant },
    { label: "영업대표", value: item.salesRep },
    { label: "고객지원 담당자", value: item.supportRep },
  ]
}
