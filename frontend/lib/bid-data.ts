export type BidCategory = "rfp" | "prb" | "proposal" | "result"

export type RfpAnalysisStatus = "접수" | "분석중" | "완료"
export type ProposalType = "자체 제안" | "SI 제안"
export type ProposalProductGroup = "EMS" | "ITSM" | "Automation" | "WSS"
export type ProposalAttachment = {
  name: string
  url?: string
  mimeType?: string
}

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

export type ProposalRecord = {
  id: string
  requestId: string
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  proposalType: ProposalType
  productGroup: ProposalProductGroup
  requestDate: string
  proposalDeadline: string
  salesRep: string
  contactName: string
  attachments?: ProposalAttachment[]
  attachmentNames: string[]
  createdAt: string
  updatedAt: string
}

const RFP_ANALYSES_STORAGE_KEY = "orbis.rfpAnalyses"
const RFP_ANALYSES_EVENT_NAME = "orbis-rfp-analyses-updated"
const PROPOSALS_STORAGE_KEY = "orbis.proposals"
const PROPOSALS_EVENT_NAME = "orbis-proposals-updated"

export const rfpList: RfpAnalysisRecord[] = [
  { id: "RFP-2026-003", requestId: "REQ-2026-010", customer: "SK텔레콤", customerCode: "CUS-004", opportunity: "SK텔레콤 NMS 업그레이드", opportunityCode: "OPP-2026-004", requester: "최민수", analyst: "김영업", receiveDate: "2026-03-12", requestDate: "2026-03-12", dueDate: "2026-03-30", status: "접수", businessType: "EMS", proposalType: "SI 제안" },
  { id: "RFP-2026-001", requestId: "REQ-2026-011", customer: "삼성전자", customerCode: "CUS-001", opportunity: "삼성전자 EMS 구축", opportunityCode: "OPP-2026-001", requester: "박지은", analyst: "김영업", receiveDate: "2026-03-10", requestDate: "2026-03-10", dueDate: "2026-03-25", status: "완료", businessType: "EMS", proposalType: "SI 제안" },
  { id: "RFP-2026-002", requestId: "REQ-2026-012", customer: "국방부", customerCode: "CUS-002", opportunity: "국방부 ITSM 도입", opportunityCode: "OPP-2026-002", requester: "한서준", analyst: "이대리", receiveDate: "2026-03-05", requestDate: "2026-03-05", dueDate: "2026-03-20", status: "분석중", businessType: "ITSM", proposalType: "자체 제안" },
]
export const prbList = [
  { id: "PRB-2026-001", rfpId: "RFP-2026-001", name: "삼성전자 통합 모니터링 시스템 구축", customer: "삼성전자", submitDate: "2026-03-15", reviewDate: "2026-03-17", result: "승인", riskLevel: "중", reviewer: "본부장" },
  { id: "PRB-2026-002", rfpId: "RFP-2026-002", name: "국방부 IT서비스관리 시스템 구축", customer: "국방부", submitDate: "2026-03-16", reviewDate: "-", result: "검토중", riskLevel: "고", reviewer: "본부장" },
]
export const proposalList: ProposalRecord[] = [
  {
    id: "PRO-2026-001",
    requestId: "REQ-2026-014",
    customerCode: "CUS-004",
    customer: "SK텔레콤",
    opportunityCode: "OPP-2026-004",
    opportunity: "SK텔레콤 NMS 업그레이드",
    proposalType: "SI 제안",
    productGroup: "EMS",
    requestDate: "2026-04-22",
    proposalDeadline: "2026-04-30",
    salesRep: "김영업",
    contactName: "박민수",
    attachments: [{ name: "SKT_NMS_제안서_최종본.pdf" }],
    attachmentNames: ["SKT_NMS_제안서_최종본.pdf"],
    createdAt: "2026-04-29T09:00:00.000Z",
    updatedAt: "2026-04-29T09:00:00.000Z",
  },
  {
    id: "PRO-2026-002",
    requestId: "REQ-2026-015",
    customerCode: "CUS-003",
    customer: "현대자동차",
    opportunityCode: "OPP-2026-003",
    opportunity: "현대차 Automation 확장",
    proposalType: "자체 제안",
    productGroup: "Automation",
    requestDate: "2026-04-28",
    proposalDeadline: "2026-05-08",
    salesRep: "박과장",
    contactName: "이영희",
    attachments: [{ name: "현대차_Automation_제안서_vFinal.pptx" }],
    attachmentNames: ["현대차_Automation_제안서_vFinal.pptx"],
    createdAt: "2026-05-02T06:30:00.000Z",
    updatedAt: "2026-05-02T06:30:00.000Z",
  },
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

function emitProposalsUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(PROPOSALS_EVENT_NAME))
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

function readStoredProposals() {
  if (!isBrowser()) return proposalList

  const stored = window.localStorage.getItem(PROPOSALS_STORAGE_KEY)
  if (!stored) return proposalList

  try {
    const parsed = JSON.parse(stored) as ProposalRecord[]
    const storedItems = Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.requestId === "string" &&
            typeof item.customerCode === "string" &&
            typeof item.opportunityCode === "string",
        )
          .map((item) => ({
            ...item,
            attachments: Array.isArray(item.attachments)
              ? item.attachments.filter((attachment) => attachment && typeof attachment.name === "string")
              : Array.isArray(item.attachmentNames)
                ? item.attachmentNames
                    .filter((name) => typeof name === "string")
                    .map((name) => ({ name }))
                : [],
            attachmentNames: Array.isArray(item.attachmentNames)
              ? item.attachmentNames.filter((name) => typeof name === "string")
              : [],
          }))
      : []

    const merged = new Map<string, ProposalRecord>()
    for (const item of proposalList) merged.set(item.id, item)
    for (const item of storedItems) merged.set(item.id, item)
    return [...merged.values()]
  } catch {
    return proposalList
  }
}

function writeStoredProposals(items: ProposalRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(items))
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

export function getProposals() {
  const items = readStoredProposals()
  if (isBrowser() && !window.localStorage.getItem(PROPOSALS_STORAGE_KEY)) {
    writeStoredProposals(items)
  }
  return items
}

export function getProposalById(id: string) {
  return getProposals().find((item) => item.id === id) ?? null
}

export function getProposalByRequestId(requestId: string) {
  return getProposals().find((item) => item.requestId === requestId) ?? null
}

export function subscribeRfpAnalysesUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined

  const listener = () => callback()
  window.addEventListener(RFP_ANALYSES_EVENT_NAME, listener)

  return () => {
    window.removeEventListener(RFP_ANALYSES_EVENT_NAME, listener)
  }
}

export function subscribeProposalUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined

  const listener = () => callback()
  window.addEventListener(PROPOSALS_EVENT_NAME, listener)

  return () => {
    window.removeEventListener(PROPOSALS_EVENT_NAME, listener)
  }
}

function nextRfpAnalysisId(items: RfpAnalysisRecord[]) {
  const max = items.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `RFP-2026-${String(max + 1).padStart(3, "0")}`
}

function nextProposalId(items: ProposalRecord[]) {
  const max = items.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `PRO-2026-${String(max + 1).padStart(3, "0")}`
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

export function saveProposal(record: Omit<ProposalRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const items = getProposals()
  const existingById = record.id ? items.find((item) => item.id === record.id) ?? null : null
  const existingByRequest = !record.id ? items.find((item) => item.requestId === record.requestId) ?? null : null
  const targetId = existingById?.id ?? existingByRequest?.id ?? record.id ?? nextProposalId(items)
  const createdAt = existingById?.createdAt ?? existingByRequest?.createdAt ?? new Date().toISOString()
  const nextRecord: ProposalRecord = {
    ...record,
    id: targetId,
    attachments: Array.isArray(record.attachments) ? record.attachments : [],
    attachmentNames: Array.isArray(record.attachmentNames) ? record.attachmentNames : [],
    createdAt,
    updatedAt: new Date().toISOString(),
  }

  const nextItems = items.some((item) => item.id === targetId)
    ? items.map((item) => (item.id === targetId ? nextRecord : item))
    : [nextRecord, ...items]

  writeStoredProposals(nextItems)
  emitProposalsUpdate()

  return nextRecord
}

export function getBidItem(category: BidCategory, id: string) {
  if (category === "rfp") return getRfpAnalysisById(id)
  if (category === "prb") return prbList.find((item) => item.id === id) ?? null
  if (category === "proposal") return getProposalById(id)
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
    { label: "제안서 코드", value: item.id },
    { label: "활동 요청 코드", value: item.requestId },
    { label: "고객사 코드", value: item.customerCode },
    { label: "사업기회 코드", value: item.opportunityCode },
    { label: "고객사명", value: item.customer },
    { label: "사업명", value: item.opportunity },
    { label: "제안형태", value: item.proposalType },
    { label: "제품군", value: item.productGroup },
    { label: "요청일", value: item.requestDate },
    { label: "제안서 마감일", value: item.proposalDeadline },
    { label: "영업대표", value: item.salesRep },
    { label: "담당자", value: item.contactName },
    { label: "첨부파일", value: item.attachmentNames?.length ? item.attachmentNames.join(", ") : "등록된 첨부파일이 없습니다." },
    { label: "상태", value: "완료" },
  ]
  return [
    { label: "입찰 번호", value: item.id }, { label: "사업명", value: item.name }, { label: "고객사", value: item.customer }, { label: "입찰일", value: item.bidDate }, { label: "결과", value: item.result }, { label: "금액", value: item.amount }, { label: "경쟁사", value: item.competitor }, { label: "담당자", value: item.salesRep }, { label: "결과 사유", value: item.result === "수주" ? item.winReason : item.loseReason },
  ]
}

export function getBidCategoryLabel(category: BidCategory) {
  if (category === "rfp") return "RFP 분석"
  if (category === "prb") return "PRB"
  if (category === "proposal") return "제안서"
  return "입찰 결과"
}

export function getBidCreateActionLabel(category: BidCategory) {
  if (category === "rfp") return "RFP 분석 실행"
  if (category === "proposal") return "제안서 등록"
  return `${getBidCategoryLabel(category)} 등록`
}
