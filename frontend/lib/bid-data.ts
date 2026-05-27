// 입찰 탭에서 사용하는 하위 화면 구분값.
// rfp=RFP 분석, prb=PRB, prb-result=PRB 결과, proposal=제안서, result=입찰 결과.
export type BidCategory = "rfp" | "prb" | "prb-result" | "proposal" | "result"

// RFP/제안/PRB/입찰결과 화면 전반에서 공통으로 쓰는 상태/제안서/제품군 코드.
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
  projectOpportunityId?: number
  assigneeId?: string
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

// 제안서 등록/상세에서 사용하는 기본 문서 모델.
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

// PRB 문서의 백오피스 상태값.
// 작성 중 -> 검토 중 -> 승인/반려의 흐름으로 문서 진행 단계를 표현한다.
export type PrbStatus = "작성 중" | "검토 중" | "승인" | "반려"

export type PrbLineItem = {
  id: string
  category?: string
  item?: string
  value?: string
  amount?: string
  note?: string
}

export type PrbApprovalLine = {
  role: string
  name: string
}

// PRB 결재선의 각 단계 키.
// 작성자, 1차 승인, 2차 승인, 배포, 공유처럼 화면에 순서대로 노출된다.
export type PrbApprovalStepKey = "author" | "firstApproval" | "secondApproval" | "deploy" | "share"

export type PrbApprovalStepStatus = "completed" | "pending" | "waiting"

export type PrbApprovalStep = {
  key: PrbApprovalStepKey
  label: string
  assignee: string
  status: PrbApprovalStepStatus
  completedAt?: string
}

// PRB 원본 문서 데이터.
// 등록 화면, 상세 조회, 변경 이력, 결재 패널에서 모두 이 모델을 기준으로 동작한다.
export type PrbRecord = {
  id: string
  workflowId?: number
  workflowStatus?: string
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  rfpAnalysisId: string
  projectOpportunityId?: number
  salesRepresentativeId?: string
  author: string
  reviewer: string
  nextApprover: string
  deployOwner: string
  shareOwner: string
  proposalDeadline: string
  createdDate: string
  status: PrbStatus
  notificationsSent?: boolean
  approvalSteps: PrbApprovalStep[]
  revisionGroupId: string
  revisionNumber: number
  parentPrbId?: string
  formData: Record<string, string>
  salesItems: PrbLineItem[]
  expenseItems: PrbLineItem[]
  purchaseItems: PrbLineItem[]
  productItems: PrbLineItem[]
  personnelItems: PrbLineItem[]
  indirectItems: PrbLineItem[]
  generalItems: PrbLineItem[]
  approvalLines: PrbApprovalLine[]
  attendeeOpinions: string[]
  version: string
  createdAt: string
  updatedAt: string
}

// PRB 결과 회의록/검토 결과를 담는 모델.
export type PrbResultRecord = {
  id: string
  workflowId?: number
  workflowStatus?: string
  prbId: string
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  proposalDeadline: string
  createdDate: string
  author: string
  meetingDate: string
  location: string
  riskFactors: string
  attendeeOpinions: {
    participant: string
    opinion: string
    decision: string
  }[]
  overallOpinion: string
  createdAt: string
  updatedAt: string
}

export type BidOutcome = "수주" | "실주"
export type BidResultAttachment = {
  name: string
  url?: string
  mimeType?: string
}

export type BidResultFile = {
  fileId: number
  originalFileName: string
  fileSize: number
  presignedUrl: string
}

export type BidResultCompetitorScore = {
  label: string
  technicalScore: string
  priceScore: string
  totalScore: string
}

export type BidResultChecklistItem = {
  label: string
  score: string
  reason: string
}

export type BidResultChecklistSection = {
  category: string
  items: BidResultChecklistItem[]
}

export type BidResultAnalysisSheet = {
  bidOverviewCustomerName: string
  bidOverviewProjectName: string
  proposalProductModule: string
  budget: string
  bidAnnouncementDate: string
  proposalSubmissionDeadline: string
  proposalPresentationDate: string
  externalPdRequired: string
  salesLeaderName: string
  pmName: string
  proposalParticipants: string
  keySuccessFactors: string
  rfpIssues: string
  proposalStrategy: string
  scoreDisclosure: string
  technicalRatio: string
  priceRatio: string
  competitors: BidResultCompetitorScore[]
  checklistSections: BidResultChecklistSection[]
}

// 입찰 결과 상세와 현황 목록에서 쓰는 최종 결과 모델.
export type BidResultRecord = {
  id: string
  workflowId?: number
  workflowStatus?: string
  proposalId: string
  requestId: string
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  proposalType: ProposalType
  productGroup: ProposalProductGroup
  proposalDeadline: string
  salesRep: string
  bidDate: string
  result: BidOutcome
  amount: string
  competitor: string
  reason: string
  analysisSheet?: BidResultAnalysisSheet
  attachments?: BidResultAttachment[]
  attachmentNames: string[]
  fileIds?: number[]
  files?: BidResultFile[]
  createdAt: string
  updatedAt: string
}

// 각 문서군을 localStorage에 저장할 때 쓰는 키들.
// 새로고침 후에도 화면 상태를 유지하기 위해 브라우저 저장소를 사용한다.
const RFP_ANALYSES_STORAGE_KEY = "orbis.rfpAnalyses"
const DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY = "orbis.deleted-rfp-analysis-ids"
const RFP_ANALYSES_EVENT_NAME = "orbis-rfp-analyses-updated"
const PROPOSALS_STORAGE_KEY = "orbis.proposals"
const DELETED_PROPOSAL_IDS_STORAGE_KEY = "orbis.deleted-proposal-ids"
const PROPOSALS_EVENT_NAME = "orbis-proposals-updated"
const PRBS_STORAGE_KEY = "orbis.prbs"
const DELETED_PRB_IDS_STORAGE_KEY = "orbis.deleted-prb-ids"
const PRBS_EVENT_NAME = "orbis-prbs-updated"
const PRB_RESULTS_STORAGE_KEY = "orbis.prbResults"
const DELETED_PRB_RESULT_IDS_STORAGE_KEY = "orbis.deleted-prb-result-ids"
const PRB_RESULTS_EVENT_NAME = "orbis-prb-results-updated"

export const rfpList: RfpAnalysisRecord[] = []
export const prbList: PrbRecord[] = []
export const proposalList: ProposalRecord[] = []
export const bidResults: BidResultRecord[] = []

export const prbResults: PrbResultRecord[] = [
]

// 화면에서 보이는 입찰 관련 상태 라벨의 전체 집합.
export const bidStatuses = ["접수", "분석중", "완료", "승인", "검토중", "작성중", "미정", "수주", "실주"]

// 브라우저에서만 storage/event를 다루도록 분기한다.
function isBrowser() {
  return typeof window !== "undefined"
}

// 각 문서 목록이 바뀌었음을 구독자에게 알리는 DOM 이벤트들.
function emitRfpAnalysesUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(RFP_ANALYSES_EVENT_NAME))
}

function emitProposalsUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(PROPOSALS_EVENT_NAME))
}

function emitBidResultsUpdate() {
  return
}

function emitPrbsUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(PRBS_EVENT_NAME))
}

function emitPrbResultsUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(PRB_RESULTS_EVENT_NAME))
}

function readStoredRfpAnalyses() {
  if (!isBrowser()) return rfpList

  const stored = window.localStorage.getItem(RFP_ANALYSES_STORAGE_KEY)
  if (!stored) return rfpList

  try {
    const parsed = JSON.parse(stored) as RfpAnalysisRecord[]
    const storedItems = Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.requestId === "string")
      : []

    const isLegacyMock = storedItems.some(
      (item) =>
        item.id.startsWith("RFP-2026-") ||
        item.requestId?.startsWith("REQ-2026-") === true,
    )

    if (isLegacyMock) {
      window.localStorage.removeItem(RFP_ANALYSES_STORAGE_KEY)
      window.localStorage.removeItem(DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY)
      return []
    }

    const deletedIds = new Set(readDeletedIds(DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY))
    const merged = new Map<string, RfpAnalysisRecord>()
    for (const item of rfpList) {
      if (!deletedIds.has(item.id)) merged.set(item.id, item)
    }
    for (const item of storedItems) merged.set(item.id, item)
    return [...merged.values()]
  } catch {
    return rfpList
  }
}

// RFP 분석 목록을 localStorage에 저장한다.
function writeStoredRfpAnalyses(items: RfpAnalysisRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(RFP_ANALYSES_STORAGE_KEY, JSON.stringify(items))
}

// 제안서 목록을 localStorage에서 읽는다.
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

    const isLegacyMock = storedItems.some(
      (item) =>
        item.id.startsWith("PRO-2026-") ||
        item.requestId.startsWith("REQ-2026-"),
    )

    if (isLegacyMock) {
      window.localStorage.removeItem(PROPOSALS_STORAGE_KEY)
      window.localStorage.removeItem(DELETED_PROPOSAL_IDS_STORAGE_KEY)
      return []
    }

    const merged = new Map<string, ProposalRecord>()
    const deletedIds = new Set(readDeletedIds(DELETED_PROPOSAL_IDS_STORAGE_KEY))
    for (const item of proposalList) {
      if (!deletedIds.has(item.id)) merged.set(item.id, item)
    }
    for (const item of storedItems) merged.set(item.id, item)
    return [...merged.values()]
  } catch {
    return proposalList
  }
}

// 제안서 목록을 localStorage에 저장한다.
function writeStoredProposals(items: ProposalRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(items))
}

// PRB 결과 목록을 localStorage에서 읽는다.
function readStoredPrbResults() {
  if (!isBrowser()) return prbResults

  const stored = window.localStorage.getItem(PRB_RESULTS_STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as PrbResultRecord[]
    const storedItems = Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.prbId === "string" &&
            typeof item.customerCode === "string" &&
            typeof item.opportunityCode === "string",
        ).map((item) => ({
          ...item,
          attendeeOpinions: Array.isArray(item.attendeeOpinions)
            ? item.attendeeOpinions.map((opinion, index) => ({
                participant: opinion?.participant ?? `참석자 ${index + 1}`,
                opinion: opinion?.opinion ?? "",
                decision: opinion?.decision ?? "",
              }))
            : [],
          meetingDate: item.meetingDate ?? "",
          location: item.location ?? "",
          riskFactors: item.riskFactors ?? "",
          overallOpinion: item.overallOpinion ?? "",
        }))
      : []

    const isLegacyMock = storedItems.some(
      (item) =>
        item.id.startsWith("PRBR-2026-") ||
        item.prbId.startsWith("PRB-2026-") ||
        item.customerCode.startsWith("CUS-PRB-"),
    )

    if (isLegacyMock) {
      window.localStorage.removeItem(PRB_RESULTS_STORAGE_KEY)
      window.localStorage.removeItem(DELETED_PRB_RESULT_IDS_STORAGE_KEY)
      return []
    }

    const deletedIds = new Set(readDeletedIds(DELETED_PRB_RESULT_IDS_STORAGE_KEY))
    return storedItems.filter((item) => !deletedIds.has(item.id))
  } catch {
    return []
  }
}

// PRB 결과 목록을 localStorage에 저장한다.
function writeStoredPrbResults(items: PrbResultRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(PRB_RESULTS_STORAGE_KEY, JSON.stringify(items))
}

// 삭제된 ID 목록을 공통 형식으로 읽는다.
function readDeletedIds(storageKey: string) {
  if (!isBrowser()) return []

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as string[]
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

// 삭제된 ID 목록을 공통 형식으로 저장한다.
function writeDeletedIds(storageKey: string, value: string[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(storageKey, JSON.stringify(value))
}

// PRB의 기본 결재 단계를 문서 상태에 맞춰 생성한다.
function buildDefaultPrbApprovalSteps(item: Partial<PrbRecord>): PrbApprovalStep[] {
  const status = item.status ?? "작성 중"
  return [
    { key: "author", label: "작성자", assignee: "영업대표", status: "completed" as const, completedAt: item.createdDate },
    { key: "firstApproval", label: "1차 승인", assignee: "팀장", status: status === "작성 중" ? "waiting" as const : status === "승인" ? "completed" as const : "pending" as const },
    { key: "secondApproval", label: "2차 승인", assignee: "본부장", status: status === "승인" ? "completed" as const : "waiting" as const },
    { key: "deploy", label: "배포", assignee: "권한 보유자", status: "waiting" as const },
    { key: "share", label: "공유", assignee: "권한 보유자", status: "waiting" as const },
  ]
}

// 저장된 PRB 레코드를 화면에서 쓰기 좋은 형태로 보정한다.
// 결재 단계, 배포/공유 담당자, revision 정보가 비어 있어도 문서가 깨지지 않도록 채운다.
function normalizePrbRecord(item: PrbRecord, fallback?: PrbRecord): PrbRecord {
  return {
    ...fallback,
    ...item,
    deployOwner: item.deployOwner ?? fallback?.deployOwner ?? "배포 권한 보유자",
    shareOwner: item.shareOwner ?? fallback?.shareOwner ?? "공유 권한 보유자",
    approvalSteps: Array.isArray(item.approvalSteps) && item.approvalSteps.length > 0
      ? item.approvalSteps
      : buildDefaultPrbApprovalSteps(item),
    revisionGroupId: item.revisionGroupId ?? fallback?.revisionGroupId ?? `PRB-GROUP-${item.id}`,
    revisionNumber: item.revisionNumber ?? fallback?.revisionNumber ?? 1,
  }
}

// localStorage에서 PRB 목록을 읽고, 레거시 목 데이터까지 정리한다.
function readStoredPrbs() {
  if (!isBrowser()) return prbList

  const stored = window.localStorage.getItem(PRBS_STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored) as PrbRecord[]
    const storedItems = Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.customerCode === "string" &&
            typeof item.opportunityCode === "string" &&
            typeof item.rfpAnalysisId === "string",
        ).map((item) => normalizePrbRecord(item))
      : []

    const isLegacyMock = storedItems.some(
      (item) =>
        item.id.startsWith("PRB-2026-") ||
        item.customerCode.startsWith("CUS-PRB-") ||
        item.opportunityCode.startsWith("OPP-PRB-"),
    )

    if (isLegacyMock) {
      window.localStorage.removeItem(PRBS_STORAGE_KEY)
      window.localStorage.removeItem(DELETED_PRB_IDS_STORAGE_KEY)
      return []
    }

    const deletedIds = new Set(readDeletedIds(DELETED_PRB_IDS_STORAGE_KEY))
    return storedItems
      .filter((item) => !deletedIds.has(item.id))
      .map((item) => normalizePrbRecord(item))
  } catch {
    return []
  }
}

// PRB 목록을 localStorage에 저장한다.
function writeStoredPrbs(items: PrbRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(PRBS_STORAGE_KEY, JSON.stringify(items))
}

// 아래 getter들은 현재 화면이 참조하는 “최종 소스”를 제공한다.
export function getRfpAnalyses() {
  const items = readStoredRfpAnalyses()
  if (isBrowser() && !window.localStorage.getItem(RFP_ANALYSES_STORAGE_KEY)) {
    writeStoredRfpAnalyses(items)
  }
  return items
}

// RFP 분석 단건 조회.
export function getRfpAnalysisById(id: string) {
  return getRfpAnalyses().find((item) => item.id === id) ?? null
}

// 활동 요청 ID로 연결된 RFP 분석을 찾는다.
export function getRfpAnalysisByRequestId(requestId: string) {
  return getRfpAnalyses().find((item) => item.requestId === requestId) ?? null
}

// 제안서 목록 조회.
export function getProposals() {
  const items = readStoredProposals()
  if (isBrowser() && !window.localStorage.getItem(PROPOSALS_STORAGE_KEY)) {
    writeStoredProposals(items)
  }
  return items
}

// 제안서 목록을 한 번에 교체한다.
export function replaceProposals(records: ProposalRecord[]) {
  writeStoredProposals(records)
  writeDeletedIds(DELETED_PROPOSAL_IDS_STORAGE_KEY, [])
  emitProposalsUpdate()
  return records
}

// 입찰 결과는 아직 서버 저장과 분리된 브라우저 상태를 그대로 쓴다.
export function getBidResults() {
  return bidResults
}

// 입찰 결과 배열을 통째로 교체한다.
export function replaceBidResults(records: BidResultRecord[]) {
  bidResults.splice(0, bidResults.length, ...records)
  return records
}

// PRB 목록 조회.
export function getPrbs() {
  const items = readStoredPrbs()
  if (isBrowser() && !window.localStorage.getItem(PRBS_STORAGE_KEY)) {
    writeStoredPrbs(items)
  }
  return items
}

// PRB 결과 목록 조회.
export function getPrbResults() {
  const items = readStoredPrbResults()
  if (isBrowser() && !window.localStorage.getItem(PRB_RESULTS_STORAGE_KEY)) {
    writeStoredPrbResults(items)
  }
  return items
}

// PRB 목록 전체 교체.
export function replacePrbs(records: PrbRecord[]) {
  writeStoredPrbs(records)
  writeDeletedIds(DELETED_PRB_IDS_STORAGE_KEY, [])
  emitPrbsUpdate()
  return records
}

// PRB 결과 목록 전체 교체.
export function replacePrbResults(records: PrbResultRecord[]) {
  writeStoredPrbResults(records)
  writeDeletedIds(DELETED_PRB_RESULT_IDS_STORAGE_KEY, [])
  emitPrbResultsUpdate()
  return records
}

// 제안서 단건 조회.
export function getProposalById(id: string) {
  return getProposals().find((item) => item.id === id) ?? null
}

// 활동 요청 ID로 연결된 제안서를 찾는다.
export function getProposalByRequestId(requestId: string) {
  return getProposals().find((item) => item.requestId === requestId) ?? null
}

// 입찰 결과 단건 조회.
export function getBidResultById(id: string) {
  return bidResults.find((item) => item.id === id) ?? null
}

// PRB 단건 조회.
export function getPrbById(id: string) {
  return getPrbs().find((item) => item.id === id) ?? null
}

// PRB 결과 단건 조회.
export function getPrbResultById(id: string) {
  return getPrbResults().find((item) => item.id === id) ?? null
}

// PRB revisionGroupId 기준으로 변경 이력 전체를 반환한다.
export function getPrbRevisionHistory(prbId: string) {
  const current = getPrbById(prbId)
  if (!current) return []

  return getPrbs()
    .filter((item) => item.revisionGroupId === current.revisionGroupId)
    .sort((a, b) => a.revisionNumber - b.revisionNumber)
}

// 제안서 ID로 연결된 입찰 결과를 찾는다.
export function getBidResultByProposalId(proposalId: string) {
  return bidResults.find((item) => item.proposalId === proposalId) ?? null
}

// 각 문서군의 변경 이벤트를 구독한다.
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

export function subscribeBidResultUpdates(callback: () => void) {
  return () => undefined
}

export function subscribePrbUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined

  const listener = () => callback()
  window.addEventListener(PRBS_EVENT_NAME, listener)

  return () => {
    window.removeEventListener(PRBS_EVENT_NAME, listener)
  }
}

export function subscribePrbResultUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined

  const listener = () => callback()
  window.addEventListener(PRB_RESULTS_EVENT_NAME, listener)

  return () => {
    window.removeEventListener(PRB_RESULTS_EVENT_NAME, listener)
  }
}

// 각 문서군별 다음 ID를 생성한다.
// 로컬 테스트/목 데이터에서도 형식을 통일하기 위해 YYYY-번호 패턴을 유지한다.
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

function nextBidResultId(items: BidResultRecord[]) {
  const max = items.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `BID-2026-${String(max + 1).padStart(3, "0")}`
}

function nextPrbId(items: PrbRecord[]) {
  const max = items.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `PRB-2026-${String(max + 1).padStart(3, "0")}`
}

function nextPrbResultId(items: PrbResultRecord[]) {
  const max = items.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `PRBR-2026-${String(max + 1).padStart(3, "0")}`
}

// RFP 분석 저장.
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
  writeDeletedIds(DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY, readDeletedIds(DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY).filter((item) => item !== targetId))
  emitRfpAnalysesUpdate()

  return nextRecord
}

// RFP 분석 전체 교체.
export function replaceRfpAnalyses(records: RfpAnalysisRecord[]) {
  writeStoredRfpAnalyses(records)
  writeDeletedIds(DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY, [])
  emitRfpAnalysesUpdate()
  return records
}

// RFP 분석 삭제.
export function deleteRfpAnalysis(id: string) {
  const items = getRfpAnalyses()
  const existing = items.find((item) => item.id === id)
  if (!existing) return { status: "not_found" as const }

  const remainingStored = items.filter((item) => item.id !== id)
  const deletedIds = new Set(readDeletedIds(DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY))
  deletedIds.add(id)

  writeStoredRfpAnalyses(remainingStored)
  writeDeletedIds(DELETED_RFP_ANALYSIS_IDS_STORAGE_KEY, [...deletedIds])
  emitRfpAnalysesUpdate()

  return { status: "deleted" as const, analysis: existing }
}

// 제안서 저장.
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
  writeDeletedIds(DELETED_PROPOSAL_IDS_STORAGE_KEY, readDeletedIds(DELETED_PROPOSAL_IDS_STORAGE_KEY).filter((item) => item !== targetId))
  emitProposalsUpdate()

  return nextRecord
}

// 제안서 삭제.
export function deleteProposal(id: string) {
  const items = getProposals()
  const existing = items.find((item) => item.id === id)
  if (!existing) return { status: "not_found" as const }

  const remainingStored = items.filter((item) => item.id !== id)
  const deletedIds = new Set(readDeletedIds(DELETED_PROPOSAL_IDS_STORAGE_KEY))
  deletedIds.add(id)

  writeStoredProposals(remainingStored)
  writeDeletedIds(DELETED_PROPOSAL_IDS_STORAGE_KEY, [...deletedIds])
  emitProposalsUpdate()

  return { status: "deleted" as const, proposal: existing }
}

// 입찰 결과 저장.
export function saveBidResult(record: Omit<BidResultRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const items = getBidResults()
  const existingById = record.id ? items.find((item) => item.id === record.id) ?? null : null
  const existingByProposal = !record.id ? items.find((item) => item.proposalId === record.proposalId) ?? null : null
  const targetId = existingById?.id ?? existingByProposal?.id ?? record.id ?? nextBidResultId(items)
  const createdAt = existingById?.createdAt ?? existingByProposal?.createdAt ?? new Date().toISOString()
  const nextRecord: BidResultRecord = {
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

  replaceBidResults(nextItems)

  return nextRecord
}

// 입찰 결과 삭제.
export function deleteBidResult(id: string) {
  const items = getBidResults()
  const existing = items.find((item) => item.id === id)
  if (!existing) return { status: "not_found" as const }

  const remainingStored = items.filter((item) => item.id !== id)
  replaceBidResults(remainingStored)

  return { status: "deleted" as const, bidResult: existing }
}

// PRB 저장.
export function savePrb(record: Omit<PrbRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const items = getPrbs()
  const existingById = record.id ? items.find((item) => item.id === record.id) ?? null : null
  const existingByRfp = !record.id && !record.parentPrbId
    ? items.find((item) => item.rfpAnalysisId === record.rfpAnalysisId && item.opportunityCode === record.opportunityCode && item.revisionNumber === 1) ?? null
    : null
  const parentPrb = record.parentPrbId ? items.find((item) => item.id === record.parentPrbId) ?? null : null
  const siblingRevisions = parentPrb
    ? items.filter((item) => item.revisionGroupId === parentPrb.revisionGroupId)
    : existingById
      ? items.filter((item) => item.revisionGroupId === existingById.revisionGroupId)
      : existingByRfp
        ? items.filter((item) => item.revisionGroupId === existingByRfp.revisionGroupId)
        : []
  const targetId = existingById?.id ?? existingByRfp?.id ?? record.id ?? nextPrbId(items)
  const createdAt = existingById?.createdAt ?? existingByRfp?.createdAt ?? new Date().toISOString()
  const nextRecord: PrbRecord = {
    ...record,
    id: targetId,
    deployOwner: record.deployOwner || existingById?.deployOwner || parentPrb?.deployOwner || "배포 권한 보유자",
    shareOwner: record.shareOwner || existingById?.shareOwner || parentPrb?.shareOwner || "공유 권한 보유자",
    approvalSteps: record.approvalSteps,
    revisionGroupId: existingById?.revisionGroupId ?? existingByRfp?.revisionGroupId ?? parentPrb?.revisionGroupId ?? `PRB-GROUP-${targetId}`,
    revisionNumber: existingById?.revisionNumber ?? existingByRfp?.revisionNumber ?? (parentPrb ? siblingRevisions.length + 1 : 1),
    parentPrbId: record.parentPrbId ?? existingById?.parentPrbId ?? undefined,
    createdAt,
    updatedAt: new Date().toISOString(),
  }

  const nextItems = items.some((item) => item.id === targetId)
    ? items.map((item) => (item.id === targetId ? nextRecord : item))
    : [nextRecord, ...items]

  writeStoredPrbs(nextItems)
  writeDeletedIds(DELETED_PRB_IDS_STORAGE_KEY, readDeletedIds(DELETED_PRB_IDS_STORAGE_KEY).filter((item) => item !== targetId))
  emitPrbsUpdate()

  return nextRecord
}

// PRB 삭제.
export function deletePrb(id: string) {
  const items = getPrbs()
  const existing = items.find((item) => item.id === id)
  if (!existing) return { status: "not_found" as const }

  const remainingStored = items.filter((item) => item.id !== id)
  const deletedIds = new Set(readDeletedIds(DELETED_PRB_IDS_STORAGE_KEY))
  deletedIds.add(id)

  writeStoredPrbs(remainingStored)
  writeDeletedIds(DELETED_PRB_IDS_STORAGE_KEY, [...deletedIds])
  emitPrbsUpdate()

  return { status: "deleted" as const, prb: existing }
}

// PRB 결과 저장.
export function savePrbResult(record: Omit<PrbResultRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const items = getPrbResults()
  const existingById = record.id ? items.find((item) => item.id === record.id) ?? null : null
  const targetId = existingById?.id ?? record.id ?? nextPrbResultId(items)
  const createdAt = existingById?.createdAt ?? new Date().toISOString()
  const nextRecord: PrbResultRecord = {
    ...record,
    id: targetId,
    createdAt,
    updatedAt: new Date().toISOString(),
  }

  const nextItems = items.some((item) => item.id === targetId)
    ? items.map((item) => (item.id === targetId ? nextRecord : item))
    : [nextRecord, ...items]

  writeStoredPrbResults(nextItems)
  writeDeletedIds(DELETED_PRB_RESULT_IDS_STORAGE_KEY, readDeletedIds(DELETED_PRB_RESULT_IDS_STORAGE_KEY).filter((item) => item !== targetId))
  emitPrbResultsUpdate()

  return nextRecord
}

// PRB 결과 삭제.
export function deletePrbResult(id: string) {
  const items = getPrbResults()
  const existing = items.find((item) => item.id === id)
  if (!existing) return { status: "not_found" as const }

  const remainingStored = items.filter((item) => item.id !== id)
  const deletedIds = new Set(readDeletedIds(DELETED_PRB_RESULT_IDS_STORAGE_KEY))
  deletedIds.add(id)

  writeStoredPrbResults(remainingStored)
  writeDeletedIds(DELETED_PRB_RESULT_IDS_STORAGE_KEY, [...deletedIds])
  emitPrbResultsUpdate()

  return { status: "deleted" as const, prbResult: existing }
}

// PRB 한 단계 결재를 완료 상태로 넘긴다.
// 화면에서 “승인” 버튼을 눌렀을 때 로컬 상태를 다음 결재 단계로 진척시키는 역할이다.
export function approvePrbStep(prbId: string, actor: string) {
  const items = getPrbs()
  const target = items.find((item) => item.id === prbId) ?? null
  if (!target) return null

  const currentStepIndex = target.approvalSteps.findIndex((step) => step.status === "pending")
  if (currentStepIndex < 0) return target

  const nextSteps = target.approvalSteps.map((step, index) => {
    if (index === currentStepIndex) {
      return { ...step, assignee: actor || step.assignee, status: "completed" as const, completedAt: new Date().toISOString().slice(0, 10) }
    }
    if (index === currentStepIndex + 1) {
      return { ...step, status: "pending" as const }
    }
    return step
  })

  const nextPending = nextSteps.find((step) => step.status === "pending")
  const nextStatus: PrbStatus = currentStepIndex >= 1 ? "승인" : "검토 중"

  const nextRecord: PrbRecord = {
    ...target,
    approvalSteps: nextSteps,
    nextApprover: nextPending?.key === "deploy"
      ? target.deployOwner
      : nextPending?.key === "share"
        ? target.shareOwner
        : nextPending?.assignee ?? target.nextApprover,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  }

  writeStoredPrbs(items.map((item) => (item.id === prbId ? nextRecord : item)))
  emitPrbsUpdate()
  return nextRecord
}

// 입찰 탭에서 상세 화면/문서 뷰가 어떤 모델을 읽을지 통합 조회한다.
export function getBidItem(category: BidCategory, id: string) {
  if (category === "rfp") return getRfpAnalysisById(id)
  if (category === "prb") return getPrbById(id)
  if (category === "prb-result") return getPrbResultById(id)
  if (category === "proposal") return getProposalById(id)
  return getBidResultById(id)
}

// 입찰 탭 상세 화면에 뿌릴 항목명/값을 카테고리별로 구성한다.
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
    { label: "PRB 번호", value: item.id },
    { label: "RFP 번호", value: item.rfpAnalysisId },
    { label: "고객사 코드", value: item.customerCode },
    { label: "사업기회 코드", value: item.opportunityCode },
    { label: "고객사", value: item.customer },
    { label: "사업명", value: item.opportunity },
    { label: "제안서 마감일", value: item.proposalDeadline },
    { label: "작성일", value: item.createdDate },
    { label: "작성자", value: item.author },
    { label: "상태", value: item.status },
    { label: "검토자", value: item.reviewer },
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
  if (category === "prb-result") return [
    { label: "PRB 결과 코드", value: item.id },
    { label: "PRB 코드", value: item.prbId },
    { label: "고객사", value: item.customer },
    { label: "사업명", value: item.opportunity },
    { label: "제안서 마감일", value: item.proposalDeadline },
    { label: "작성일", value: item.createdDate },
    { label: "작성자", value: item.author },
    { label: "일시", value: item.meetingDate || "-" },
    { label: "장소", value: item.location || "-" },
    { label: "리스크 요인", value: item.riskFactors || "-" },
    { label: "종합 의견", value: item.overallOpinion || "-" },
  ]
  return [
    { label: "입찰 번호", value: item.id },
    { label: "제안서 코드", value: item.proposalId },
    { label: "사업명", value: item.opportunity },
    { label: "고객사", value: item.customer },
    { label: "제안형태", value: item.proposalType },
    { label: "제품군", value: item.productGroup },
    { label: "제안서 마감일", value: item.proposalDeadline },
    { label: "입찰 결과", value: item.result },
    { label: "영업대표", value: item.salesRep },
    { label: "상태", value: item.result },
    { label: "입찰일", value: item.bidDate },
    { label: "금액", value: item.amount },
    { label: "경쟁사", value: item.competitor },
    { label: "결과 사유", value: item.reason },
  ]
}

// 입찰 메인 목록/탭에 표시할 한글 제목을 만든다.
export function getBidCategoryLabel(category: BidCategory) {
  if (category === "rfp") return "RFP 분석"
  if (category === "prb") return "PRB"
  if (category === "prb-result") return "PRB 결과"
  if (category === "proposal") return "제안서"
  return "입찰 결과"
}

// 입찰 메인에서 “등록” 버튼/CTA 라벨을 문서 종류에 맞게 바꾼다.
export function getBidCreateActionLabel(category: BidCategory) {
  if (category === "rfp") return "RFP 분석 실행"
  if (category === "prb-result") return "PRB 결과 등록"
  if (category === "proposal") return "제안서 등록"
  return `${getBidCategoryLabel(category)} 등록`
}
