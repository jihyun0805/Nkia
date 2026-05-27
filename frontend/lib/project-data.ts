export type ProjectCategory = "results" | "billingAndCollection" | "revenue"

export const projectResults: any[] = []

export const billings: any[] = []

export const collections: any[] = []

export const billingAndCollections: any[] = []

export const expectedRevenue: any[] = []

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
