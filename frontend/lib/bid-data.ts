export type BidCategory = "rfp" | "prb" | "prb-result" | "proposal" | "result"

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

export type PrbApprovalStepKey = "author" | "firstApproval" | "secondApproval" | "deploy" | "share"

export type PrbApprovalStepStatus = "completed" | "pending" | "waiting"

export type PrbApprovalStep = {
  key: PrbApprovalStepKey
  label: string
  assignee: string
  status: PrbApprovalStepStatus
  completedAt?: string
}

export type PrbRecord = {
  id: string
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  rfpAnalysisId: string
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

export type PrbResultRecord = {
  id: string
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

export type BidResultRecord = {
  id: string
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
  createdAt: string
  updatedAt: string
}

const RFP_ANALYSES_STORAGE_KEY = "orbis.rfpAnalyses"
const RFP_ANALYSES_EVENT_NAME = "orbis-rfp-analyses-updated"
const PROPOSALS_STORAGE_KEY = "orbis.proposals"
const PROPOSALS_EVENT_NAME = "orbis-proposals-updated"
const BID_RESULTS_STORAGE_KEY = "orbis.bidResults"
const BID_RESULTS_EVENT_NAME = "orbis-bid-results-updated"
const PRBS_STORAGE_KEY = "orbis.prbs"
const PRBS_EVENT_NAME = "orbis-prbs-updated"
const PRB_RESULTS_STORAGE_KEY = "orbis.prbResults"
const PRB_RESULTS_EVENT_NAME = "orbis-prb-results-updated"

export const rfpList: RfpAnalysisRecord[] = [
  { id: "RFP-2026-003", requestId: "REQ-2026-010", customer: "SK텔레콤", customerCode: "CUS-004", opportunity: "SK텔레콤 NMS 업그레이드", opportunityCode: "OPP-2026-004", requester: "최민수", analyst: "김영업", receiveDate: "2026-03-12", requestDate: "2026-03-12", dueDate: "2026-03-30", status: "접수", businessType: "EMS", proposalType: "SI 제안" },
  { id: "RFP-2026-001", requestId: "REQ-2026-011", customer: "삼성전자", customerCode: "CUS-001", opportunity: "삼성전자 EMS 구축", opportunityCode: "OPP-2026-001", requester: "박지은", analyst: "김영업", receiveDate: "2026-03-10", requestDate: "2026-03-10", dueDate: "2026-03-25", status: "완료", businessType: "EMS", proposalType: "SI 제안" },
  { id: "RFP-2026-002", requestId: "REQ-2026-012", customer: "국방부", customerCode: "CUS-002", opportunity: "국방부 ITSM 도입", opportunityCode: "OPP-2026-002", requester: "한서준", analyst: "이대리", receiveDate: "2026-03-05", requestDate: "2026-03-05", dueDate: "2026-03-20", status: "분석중", businessType: "ITSM", proposalType: "자체 제안" },
]
const seedPrbList = [
  { id: "PRB-2026-001", rfpId: "RFP-2026-001", name: "삼성전자 통합 모니터링 시스템 구축", customer: "삼성전자", proposalDeadline: "2026-03-25", createdDate: "2026-03-15", author: "김영업", status: "승인", reviewer: "본부장" },
  { id: "PRB-2026-002", rfpId: "RFP-2026-002", name: "국방부 IT서비스관리 시스템 구축", customer: "국방부", proposalDeadline: "2026-03-20", createdDate: "2026-03-16", author: "이대리", status: "검토 중", reviewer: "본부장" },
  { id: "PRB-2026-003", rfpId: "RFP-2026-003", name: "SK텔레콤 NMS 업그레이드", customer: "SK텔레콤", proposalDeadline: "2026-03-30", createdDate: "2026-03-18", author: "최민수", status: "작성 중", reviewer: "-" },
  { id: "PRB-2026-004", rfpId: "RFP-2026-004", name: "현대차 Automation 확장", customer: "현대자동차", proposalDeadline: "2026-03-28", createdDate: "2026-03-19", author: "박과장", status: "반려", reviewer: "본부장" },
  { id: "PRB-2026-005", rfpId: "RFP-2026-001", name: "삼성전자 EMS 구축 2차 제안", customer: "삼성전자", proposalDeadline: "2026-04-02", createdDate: "2026-03-27", author: "김영업", status: "승인", reviewer: "본부장" },
  { id: "PRB-2026-006", rfpId: "RFP-2026-003", name: "SK텔레콤 NMS 고도화 추가 범위", customer: "SK텔레콤", proposalDeadline: "2026-04-05", createdDate: "2026-03-29", author: "김영업", status: "승인", reviewer: "본부장" },
]

export const prbList: PrbRecord[] = seedPrbList.map((item, index) => ({
  id: item.id,
  customerCode: `CUS-PRB-${String(index + 1).padStart(3, "0")}`,
  customer: item.customer,
  opportunityCode: `OPP-PRB-${String(index + 1).padStart(3, "0")}`,
  opportunity: item.name,
  rfpAnalysisId: item.rfpId,
  author: item.author,
  reviewer: item.reviewer,
  nextApprover: item.reviewer === "-" ? "영업팀장" : item.reviewer,
  deployOwner: "배포 권한 보유자",
  shareOwner: "공유 권한 보유자",
  proposalDeadline: item.proposalDeadline,
  createdDate: item.createdDate,
  status: item.status as PrbStatus,
  notificationsSent: item.status === "검토 중",
  approvalSteps: [
    { key: "author", label: "작성자", assignee: "영업대표", status: "completed", completedAt: item.createdDate },
    { key: "firstApproval", label: "1차 승인", assignee: "팀장", status: item.status === "작성 중" ? "waiting" : item.status === "승인" ? "completed" : "pending" },
    { key: "secondApproval", label: "2차 승인", assignee: "본부장", status: item.status === "승인" ? "completed" : "waiting" },
    { key: "deploy", label: "배포", assignee: "권한 보유자", status: "waiting" },
    { key: "share", label: "공유", assignee: "권한 보유자", status: "waiting" },
  ],
  revisionGroupId: `PRB-GROUP-${index + 1}`,
  revisionNumber: 1,
  formData: {
    reportDate: item.createdDate,
    businessName: item.name,
    customerName: item.customer,
    authorDepartment: "영업본부",
  },
  salesItems: [],
  expenseItems: [],
  purchaseItems: [],
  productItems: [],
  personnelItems: [],
  indirectItems: [],
  generalItems: [],
  approvalLines: [
    { role: "영업대표", name: item.author },
    { role: "팀장", name: "영업팀장" },
    { role: "본부장", name: item.reviewer === "-" ? "본부장" : item.reviewer },
    { role: "배포", name: "권한 보유자" },
    { role: "공유", name: "권한 보유자" },
  ],
  attendeeOpinions: ["", "", ""],
  version: "v1.0",
  createdAt: `${item.createdDate}T09:00:00.000Z`,
  updatedAt: `${item.createdDate}T09:00:00.000Z`,
}))
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
export const bidResults: BidResultRecord[] = [
  {
    id: "BID-2026-001",
    proposalId: "PRO-2026-001",
    requestId: "REQ-2026-014",
    customerCode: "CUS-004",
    customer: "SK텔레콤",
    opportunityCode: "OPP-2026-004",
    opportunity: "SK텔레콤 NMS 업그레이드",
    proposalType: "SI 제안",
    productGroup: "EMS",
    proposalDeadline: "2026-04-30",
    salesRep: "김영업",
    bidDate: "2026-05-03",
    result: "수주",
    amount: "3억",
    competitor: "와이즈스톤",
    reason: "기술 적합성과 기존 레퍼런스 경쟁력이 우세했습니다.",
    attachments: [{ name: "SKT_NMS_입찰결과보고.pdf" }],
    attachmentNames: ["SKT_NMS_입찰결과보고.pdf"],
    createdAt: "2026-05-03T10:30:00.000Z",
    updatedAt: "2026-05-03T10:30:00.000Z",
  },
]

export const prbResults: PrbResultRecord[] = [
  {
    id: "PRBR-2026-001",
    prbId: "PRB-2026-004",
    customerCode: "CUS-PRB-004",
    customer: "현대자동차",
    opportunityCode: "OPP-PRB-004",
    opportunity: "현대차 Automation 확장",
    proposalDeadline: "2026-03-28",
    createdDate: "2026-03-21",
    author: "박과장",
    meetingDate: "2026-03-21 14:00",
    location: "현대자동차 본사 5층 회의실",
    riskFactors: "원가 경쟁 심화와 일정 단축 요구에 대한 대응 방안 재정비 필요.",
    attendeeOpinions: Array.from({ length: 7 }, (_, index) => ({
      participant: `참석자 ${index + 1}`,
      opinion: "",
      decision: "찬성",
    })),
    overallOpinion: "추가 원가 검토 후 조건부 진행.",
    createdAt: "2026-03-21T09:30:00.000Z",
    updatedAt: "2026-03-21T09:30:00.000Z",
  },
  {
    id: "PRBR-2026-002",
    prbId: "PRB-2026-002",
    customerCode: "CUS-PRB-002",
    customer: "국방부",
    opportunityCode: "OPP-PRB-002",
    opportunity: "국방부 IT서비스관리 시스템 구축",
    proposalDeadline: "2026-03-20",
    createdDate: "2026-03-22",
    author: "이대리",
    meetingDate: "2026-03-22 10:00",
    location: "국방부 화상회의",
    riskFactors: "파트너 역할 분담과 고객 요구 범위가 일부 불명확.",
    attendeeOpinions: Array.from({ length: 7 }, (_, index) => ({
      participant: `참석자 ${index + 1}`,
      opinion: "",
      decision: "찬성",
    })),
    overallOpinion: "파트너 범위 확인 후 진행.",
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-03-22T10:00:00.000Z",
  },
  {
    id: "PRBR-2026-003",
    prbId: "PRB-2026-001",
    customerCode: "CUS-PRB-001",
    customer: "삼성전자",
    opportunityCode: "OPP-PRB-001",
    opportunity: "삼성전자 통합 모니터링 시스템 구축",
    proposalDeadline: "2026-03-25",
    createdDate: "2026-03-24",
    author: "김영업",
    meetingDate: "2026-03-24 15:00",
    location: "삼성전자 서초사옥",
    riskFactors: "제안 발표 일정이 촉박하여 산출물 품질 관리 필요.",
    attendeeOpinions: Array.from({ length: 7 }, (_, index) => ({
      participant: `참석자 ${index + 1}`,
      opinion: "",
      decision: "찬성",
    })),
    overallOpinion: "승인 기준 충족으로 추진.",
    createdAt: "2026-03-24T14:00:00.000Z",
    updatedAt: "2026-03-24T14:00:00.000Z",
  },
]

export const bidStatuses = ["접수", "분석중", "완료", "승인", "검토중", "작성중", "미정", "수주", "실주"]

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

function emitBidResultsUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(BID_RESULTS_EVENT_NAME))
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

function readStoredBidResults() {
  if (!isBrowser()) return bidResults

  const stored = window.localStorage.getItem(BID_RESULTS_STORAGE_KEY)
  if (!stored) return bidResults

  try {
    const parsed = JSON.parse(stored) as BidResultRecord[]
    const storedItems = Array.isArray(parsed)
      ? parsed
          .filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.proposalId === "string" &&
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

    const merged = new Map<string, BidResultRecord>()
    for (const item of bidResults) merged.set(item.id, item)
    for (const item of storedItems) merged.set(item.id, item)
    return [...merged.values()]
  } catch {
    return bidResults
  }
}

function writeStoredBidResults(items: BidResultRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(BID_RESULTS_STORAGE_KEY, JSON.stringify(items))
}

function readStoredPrbResults() {
  if (!isBrowser()) return prbResults

  const stored = window.localStorage.getItem(PRB_RESULTS_STORAGE_KEY)
  if (!stored) return prbResults

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

    const merged = new Map<string, PrbResultRecord>()
    for (const item of prbResults) merged.set(item.id, item)
    for (const item of storedItems) merged.set(item.id, item)
    return [...merged.values()]
  } catch {
    return prbResults
  }
}

function writeStoredPrbResults(items: PrbResultRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(PRB_RESULTS_STORAGE_KEY, JSON.stringify(items))
}

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

function readStoredPrbs() {
  if (!isBrowser()) return prbList

  const stored = window.localStorage.getItem(PRBS_STORAGE_KEY)
  if (!stored) return prbList

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

    const merged = new Map<string, PrbRecord>()
    for (const item of prbList) merged.set(item.id, item)
    for (const item of storedItems) merged.set(item.id, normalizePrbRecord(item, merged.get(item.id)))
    return [...merged.values()]
  } catch {
    return prbList
  }
}

function writeStoredPrbs(items: PrbRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(PRBS_STORAGE_KEY, JSON.stringify(items))
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

export function getBidResults() {
  const items = readStoredBidResults()
  if (isBrowser() && !window.localStorage.getItem(BID_RESULTS_STORAGE_KEY)) {
    writeStoredBidResults(items)
  }
  return items
}

export function getPrbs() {
  const items = readStoredPrbs()
  if (isBrowser() && !window.localStorage.getItem(PRBS_STORAGE_KEY)) {
    writeStoredPrbs(items)
  }
  return items
}

export function getPrbResults() {
  const items = readStoredPrbResults()
  if (isBrowser() && !window.localStorage.getItem(PRB_RESULTS_STORAGE_KEY)) {
    writeStoredPrbResults(items)
  }
  return items
}

export function getProposalById(id: string) {
  return getProposals().find((item) => item.id === id) ?? null
}

export function getProposalByRequestId(requestId: string) {
  return getProposals().find((item) => item.requestId === requestId) ?? null
}

export function getBidResultById(id: string) {
  return getBidResults().find((item) => item.id === id) ?? null
}

export function getPrbById(id: string) {
  return getPrbs().find((item) => item.id === id) ?? null
}

export function getPrbResultById(id: string) {
  return getPrbResults().find((item) => item.id === id) ?? null
}

export function getPrbRevisionHistory(prbId: string) {
  const current = getPrbById(prbId)
  if (!current) return []

  return getPrbs()
    .filter((item) => item.revisionGroupId === current.revisionGroupId)
    .sort((a, b) => a.revisionNumber - b.revisionNumber)
}

export function getBidResultByProposalId(proposalId: string) {
  return getBidResults().find((item) => item.proposalId === proposalId) ?? null
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

export function subscribeBidResultUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined

  const listener = () => callback()
  window.addEventListener(BID_RESULTS_EVENT_NAME, listener)

  return () => {
    window.removeEventListener(BID_RESULTS_EVENT_NAME, listener)
  }
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

  writeStoredBidResults(nextItems)
  emitBidResultsUpdate()

  return nextRecord
}

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
  emitPrbsUpdate()

  return nextRecord
}

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
  emitPrbResultsUpdate()

  return nextRecord
}

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

export function getBidItem(category: BidCategory, id: string) {
  if (category === "rfp") return getRfpAnalysisById(id)
  if (category === "prb") return getPrbById(id)
  if (category === "prb-result") return getPrbResultById(id)
  if (category === "proposal") return getProposalById(id)
  return getBidResultById(id)
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

export function getBidCategoryLabel(category: BidCategory) {
  if (category === "rfp") return "RFP 분석"
  if (category === "prb") return "PRB"
  if (category === "prb-result") return "PRB 결과"
  if (category === "proposal") return "제안서"
  return "입찰 결과"
}

export function getBidCreateActionLabel(category: BidCategory) {
  if (category === "rfp") return "RFP 분석 실행"
  if (category === "prb-result") return "PRB 결과 등록"
  if (category === "proposal") return "제안서 등록"
  return `${getBidCategoryLabel(category)} 등록`
}
