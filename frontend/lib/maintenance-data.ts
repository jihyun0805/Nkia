export type MaintenanceCategory = "free" | "paid" | "support"

export const freeMaintenances: any[] = []

export const paidMaintenances: any[] = []

export const customerSupports: any[] = []

export const supportHistories: any[] = [];


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
