export type BidCategory = "rfp" | "prb" | "proposal" | "result"

export const rfpList = [
  { id: "RFP-2026-001", name: "삼성전자 통합 모니터링 시스템 구축", customer: "삼성전자", receiveDate: "2026-03-10", dueDate: "2026-03-25", bidDate: "2026-04-05", amount: "5억", status: "분석완료", analyst: "김영업" },
  { id: "RFP-2026-002", name: "국방부 IT서비스관리 시스템 구축", customer: "국방부", receiveDate: "2026-03-05", dueDate: "2026-03-20", bidDate: "2026-04-01", amount: "8억", status: "분석중", analyst: "이대리" },
  { id: "RFP-2026-003", name: "SK텔레콤 네트워크 관리 시스템 고도화", customer: "SK텔레콤", receiveDate: "2026-03-12", dueDate: "2026-03-30", bidDate: "2026-04-10", amount: "2억", status: "입수", analyst: "김영업" },
]
export const prbList = [
  { id: "PRB-2026-001", rfpId: "RFP-2026-001", name: "삼성전자 통합 모니터링 시스템 구축", customer: "삼성전자", submitDate: "2026-03-15", reviewDate: "2026-03-17", result: "승인", riskLevel: "중", reviewer: "본부장" },
  { id: "PRB-2026-002", rfpId: "RFP-2026-002", name: "국방부 IT서비스관리 시스템 구축", customer: "국방부", submitDate: "2026-03-16", reviewDate: "-", result: "검토중", riskLevel: "고", reviewer: "본부장" },
]
export const proposalList = [
  { id: "PRP-2026-001", rfpId: "RFP-2026-001", name: "삼성전자 통합 모니터링 시스템 구축", customer: "삼성전자", startDate: "2026-03-18", dueDate: "2026-04-03", progress: 60, status: "작성중", manager: "박PM" },
  { id: "PRP-2026-002", rfpId: "RFP-2026-002", name: "국방부 IT서비스관리 시스템 구축", customer: "국방부", startDate: "2026-03-17", dueDate: "2026-03-30", progress: 30, status: "작성중", manager: "최PM" },
]
export const bidResults = [
  { id: "BID-2026-001", name: "농협은행 통합 모니터링 시스템", customer: "농협은행", bidDate: "2026-03-01", result: "수주", amount: "3억", competitor: "와이즈스톤", winReason: "기술력 우위, 레퍼런스 다수", salesRep: "김영업" },
  { id: "BID-2026-002", name: "한전 ITSM 구축", customer: "한국전력", bidDate: "2026-02-20", result: "실주", amount: "6억", competitor: "삼성SDS", loseReason: "가격 경쟁력 부족", salesRep: "이대리" },
  { id: "BID-2026-003", name: "우리은행 자동화 시스템", customer: "우리은행", bidDate: "2026-02-15", result: "수주", amount: "2.5억", competitor: "티맥스소프트", winReason: "고객 관계, 맞춤 솔루션 제안", salesRep: "박과장" },
]

export const bidStatuses = ["분석완료", "분석중", "입수", "승인", "검토중", "작성중", "수주", "실주"]

export function getBidItem(category: BidCategory, id: string) {
  if (category === "rfp") return rfpList.find((item) => item.id === id) ?? null
  if (category === "prb") return prbList.find((item) => item.id === id) ?? null
  if (category === "proposal") return proposalList.find((item) => item.id === id) ?? null
  return bidResults.find((item) => item.id === id) ?? null
}

export function getBidFields(category: BidCategory, item: any) {
  if (category === "rfp") return [
    { label: "RFP 번호", value: item.id }, { label: "사업명", value: item.name }, { label: "고객사", value: item.customer }, { label: "입수일", value: item.receiveDate }, { label: "제출 마감일", value: item.dueDate }, { label: "입찰일", value: item.bidDate }, { label: "예상 금액", value: item.amount }, { label: "입수 방법", value: "-" }, { label: "RFP 분석 내용", value: "-" }, { label: "상태", value: item.status }, { label: "담당자", value: item.analyst },
  ]
  if (category === "prb") return [
    { label: "PRB 번호", value: item.id }, { label: "RFP 번호", value: item.rfpId }, { label: "검토자", value: item.reviewer }, { label: "상신일", value: item.submitDate }, { label: "검토일", value: item.reviewDate }, { label: "리스크 등급", value: item.riskLevel }, { label: "검토 의견", value: item.result }, { label: "사업명", value: item.name }, { label: "고객사", value: item.customer },
  ]
  if (category === "proposal") return [
    { label: "제안 번호", value: item.id }, { label: "RFP 번호", value: item.rfpId }, { label: "PM", value: item.manager }, { label: "작성 시작일", value: item.startDate }, { label: "제출 마감일", value: item.dueDate }, { label: "제안 전략", value: `${item.progress}% 진행 중` }, { label: "사업명", value: item.name }, { label: "고객사", value: item.customer }, { label: "상태", value: item.status },
  ]
  return [
    { label: "입찰 번호", value: item.id }, { label: "사업명", value: item.name }, { label: "고객사", value: item.customer }, { label: "입찰일", value: item.bidDate }, { label: "결과", value: item.result }, { label: "금액", value: item.amount }, { label: "경쟁사", value: item.competitor }, { label: "담당자", value: item.salesRep }, { label: "결과 사유", value: item.result === "수주" ? item.winReason : item.loseReason },
  ]
}

export function getBidCategoryLabel(category: BidCategory) {
  if (category === "rfp") return "RFP"
  if (category === "prb") return "PRB"
  if (category === "proposal") return "제안"
  return "입찰 결과"
}
