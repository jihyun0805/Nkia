export type BidCategory = "rfp" | "prb" | "proposal" | "result"

export type RfpAnalysisStatus = "접수" | "분석중" | "완료"

export type RfpAnalysisRequirement = {
  category: string
  requirementCode: string
  requirementTitle: string
  requirementContent: string
  supportStatus: "O" | "X" | "∆" | "?"
  reviewNote: string
  effort: string
}

export type RfpAnalysisRecord = {
  id: string
  requestId?: string
  customer: string
  customerCode: string
  opportunity: string
  opportunityCode: string
  requester: string
  analyst: string
  receiveDate: string
  requestDate: string
  dueDate: string
  status: RfpAnalysisStatus
  businessType: string
  proposalType: string
  deliveryModule?: string
  hardwareOwner?: string
  majorContent?: string
  amountScale?: string
  projectPeriod?: string
  businessPlace?: string
  proposalDeadline?: string
  requirements?: RfpAnalysisRequirement[]
  updatedAt?: string
}

const RFP_ANALYSES_STORAGE_KEY = "orbis.rfpAnalyses"
const RFP_ANALYSES_EVENT_NAME = "orbis-rfp-analyses-updated"

export const rfpList: RfpAnalysisRecord[] = [
  { id: "RFP-2026-003", requestId: "REQ-2026-010", customer: "SK텔레콤", customerCode: "CUS-004", opportunity: "SK텔레콤 NMS 업그레이드", opportunityCode: "OPP-2026-004", requester: "최민수", analyst: "김영업", receiveDate: "2026-03-12", requestDate: "2026-03-12", dueDate: "2026-03-30", status: "접수", businessType: "EMS", proposalType: "SI 제안" },
  { id: "RFP-2026-001", requestId: "REQ-2026-011", customer: "삼성전자", customerCode: "CUS-001", opportunity: "삼성전자 EMS 구축", opportunityCode: "OPP-2026-001", requester: "박지은", analyst: "김영업", receiveDate: "2026-03-10", requestDate: "2026-03-10", dueDate: "2026-03-25", status: "완료", businessType: "EMS", proposalType: "SI 제안" },
  { id: "RFP-2026-002", requestId: "REQ-2026-012", customer: "국방부", customerCode: "CUS-002", opportunity: "국방부 ITSM 도입", opportunityCode: "OPP-2026-002", requester: "한서준", analyst: "이대리", receiveDate: "2026-03-05", requestDate: "2026-03-05", dueDate: "2026-03-20", status: "분석중", businessType: "ITSM", proposalType: "자체 제안" },
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

export const bidStatuses = ["접수", "분석중", "완료", "승인", "검토중", "작성중", "수주", "실주"]

function isBrowser() {
  return typeof window !== "undefined"
}

function emitRfpAnalysesUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(RFP_ANALYSES_EVENT_NAME))
}

function readStoredRfpAnalyses() {
  if (!isBrowser()) return rfpList

  const stored = window.localStorage.getItem(RFP_ANALYSES_STORAGE_KEY)
  if (!stored) return rfpList

  try {
    const parsed = JSON.parse(stored) as RfpAnalysisRecord[]
    return Array.isArray(parsed) ? parsed : rfpList
  } catch {
    return rfpList
  }
}

function writeStoredRfpAnalyses(items: RfpAnalysisRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(RFP_ANALYSES_STORAGE_KEY, JSON.stringify(items))
}

export function getRfpAnalyses() {
  const items = readStoredRfpAnalyses()
  if (isBrowser() && !window.localStorage.getItem(RFP_ANALYSES_STORAGE_KEY)) {
    writeStoredRfpAnalyses(items)
  }
  return items
}

export function getRfpAnalysisById(id: string) {
  return getRfpAnalyses().find((item) => item.id === id) ?? null
}

export function getRfpAnalysisByRequestId(requestId: string) {
  return getRfpAnalyses().find((item) => item.requestId === requestId) ?? null
}

export function subscribeRfpAnalysesUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined

  const listener = () => callback()
  window.addEventListener(RFP_ANALYSES_EVENT_NAME, listener)

  return () => {
    window.removeEventListener(RFP_ANALYSES_EVENT_NAME, listener)
  }
}

function nextRfpAnalysisId(items: RfpAnalysisRecord[]) {
  const max = items.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `RFP-2026-${String(max + 1).padStart(3, "0")}`
}

export function saveRfpAnalysis(record: Omit<RfpAnalysisRecord, "id"> & { id?: string }) {
  const items = getRfpAnalyses()
  const targetId = record.id ?? nextRfpAnalysisId(items)
  const nextRecord: RfpAnalysisRecord = {
    ...record,
    id: targetId,
    updatedAt: new Date().toISOString(),
  }

  const exists = items.some((item) => item.id === targetId)
  const nextItems = exists
    ? items.map((item) => (item.id === targetId ? nextRecord : item))
    : [nextRecord, ...items]

  writeStoredRfpAnalyses(nextItems)
  emitRfpAnalysesUpdate()

  return nextRecord
}

export function getBidItem(category: BidCategory, id: string) {
  if (category === "rfp") return getRfpAnalysisById(id)
  if (category === "prb") return prbList.find((item) => item.id === id) ?? null
  if (category === "proposal") return proposalList.find((item) => item.id === id) ?? null
  return bidResults.find((item) => item.id === id) ?? null
}

export function getBidFields(category: BidCategory, item: any) {
  if (category === "rfp") return [
    { label: "RFP 번호", value: item.id },
    { label: "고객사", value: item.customer },
    { label: "사업기회", value: item.opportunity },
    { label: "요청자", value: item.requester },
    { label: "담당자", value: item.analyst },
    { label: "접수일", value: item.receiveDate },
    { label: "마감일", value: item.dueDate },
    { label: "상태", value: item.status },
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
  if (category === "rfp") return "RFP 분석"
  if (category === "prb") return "PRB"
  if (category === "proposal") return "제안"
  return "입찰 결과"
}

export function getBidCreateActionLabel(category: BidCategory) {
  if (category === "rfp") return "RFP 분석 실행"
  return `${getBidCategoryLabel(category)} 등록`
}
