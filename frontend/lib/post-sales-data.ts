export const postSalesActivities = [
  { id: "PSA-2026-001", date: "2026-03-17", customerCode: "CUS-010", businessCode: "-", customer: "신한은행", product: "ITSM Pro", type: "증설제안", content: "ITSM 추가 모듈 도입 제안", result: "관심표명", nextAction: "상세 제안서 준비", opportunity: "-", manager: "정관리" },
  { id: "PSA-2026-002", date: "2026-03-15", customerCode: "CUS-011", businessCode: "OPP-2026-010", customer: "삼성SDS", product: "EMS Standard", type: "업그레이드", content: "Enterprise 버전 업그레이드 제안", result: "검토중", nextAction: "견적서 전달", opportunity: "OPP-2026-010", manager: "김유지" },
  { id: "PSA-2026-003", date: "2026-03-10", customerCode: "CUS-012", businessCode: "OPP-2026-012", customer: "농협은행", product: "EMS Enterprise", type: "신규제품", content: "Automation 솔루션 교차 판매 제안", result: "발굴", nextAction: "데모 일정 협의", opportunity: "OPP-2026-012", manager: "김영업" },
  { id: "PSA-2026-004", date: "2026-03-05", customerCode: "CUS-013", businessCode: "-", customer: "LG전자", product: "EMS Enterprise", type: "확장", content: "추가 사이트 모니터링 확장", result: "포기", nextAction: "-", opportunity: "-", manager: "이보수" },
]

export const postSalesStatuses = ["관심표명", "검토중", "발굴", "포기"]

export function getPostSalesItem(id: string) {
  return postSalesActivities.find((item) => item.id === id) ?? null
}

export function getPostSalesFields(item: any) {
  return [
    { label: "활동번호", value: item.id },
    { label: "활동일", value: item.date },
    { label: "고객 코드", value: item.customerCode },
    { label: "사업 코드", value: item.businessCode },
    { label: "고객사", value: item.customer },
    { label: "기존 제품", value: item.product },
    { label: "활동 유형", value: item.type },
    { label: "활동 내용", value: item.content },
    { label: "결과", value: item.result },
    { label: "담당자", value: item.manager },
    { label: "다음 할 일", value: item.nextAction },
    { label: "사업기회", value: item.opportunity },
  ]
}
