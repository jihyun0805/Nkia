"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { currentUser } from "@/lib/current-user"
import { loadBackendFindingData, type FindingBackendData } from "@/lib/finding-backend"
import { loadBackendProposals } from "@/lib/proposal-backend"
import {
  type BidOutcome,
  type BidResultAnalysisSheet,
  type BidResultChecklistSection,
  type BidResultCompetitorScore,
  type BidResultRecord,
  type ProposalRecord,
  type ProposalProductGroup,
} from "@/lib/bid-data"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type BackendPage<T> = {
  content?: T[]
}

type BackendMyInfoResponse = {
  userId?: string
  name?: string
  email?: string
}

type BackendUserSummary = {
  id?: string
  name?: string
  email?: string
}

type BackendBidResultListItem = {
  id?: number
  opportunityName?: string
  customerCompanyName?: string
  proposalDeadline?: string
  proposalType?: string
  bidOutcome?: string
  salesRepresentativeName?: string
  createdAt?: string
}

type BackendCompanyScore = {
  companyName?: string
  technicalScore?: number
  priceScore?: number
}

type BackendWinLossAnalysis = {
  category?: string
  evaluationItem?: string
  score?: number
  reason?: string
}

type BackendBidResultDetailResponse = {
  id?: number
  workflowId?: number
  status?: string
  budget?: number | string | null
  isExternalPdInvolved?: boolean
  keySuccessFactors?: string
  rfpIssues?: string
  proposalStrategy?: string
  bidOutcome?: string
  disclosureStatus?: string
  bidAnnouncementDate?: string
  presentationDate?: string
  totalAnalysisScore?: number
  salesRepresentativeName?: string
  projectManagerName?: string
  opportunityCode?: string
  opportunityName?: string
  customerCompanyCode?: string
  customerCompanyName?: string
  proposalId?: number
  proposalCreatorName?: string
  proposalDeadline?: string
  productModules?: { id?: number; productName?: string }[]
  ourCompanyScore?: BackendCompanyScore | null
  competitorScores?: BackendCompanyScore[]
  analyses?: BackendWinLossAnalysis[]
}

type BackendBidResultPrefillResponse = {
  customerCompanyCode?: string | null
  customerCompanyName?: string | null
  projectOpportunityCode?: string | null
  projectOpportunityName?: string | null
  productModulesName?: string[] | null
  proposalDeadLine?: string | null
  proposalPresentationDate?: string | null
  proposalCreateUserName?: string | null
}

export type BackendBidResultHistoryListItem = {
  historyId?: number
  bidResultId?: number
  version?: number
  bidOutcome?: string
  createdAt?: string
}

type BackendBidResultHistoryResponse = BackendBidResultDetailResponse & {
  historyId?: number
  bidResultId?: number
  version?: number
}

export type BidResultSaveInput = {
  id?: string
  proposalId?: string
  requestId?: string
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  proposalType: "자체 제안" | "SI 제안" | ""
  productGroup: ProposalProductGroup | ""
  proposalDeadline: string
  salesRep: string
  bidDate: string
  result: BidOutcome
  amount: string
  competitor: string
  reason: string
  analysisSheet: BidResultAnalysisSheet
}

const BID_RESULT_LIST_SIZE = 2000

const analysisSectionTemplate: BidResultChecklistSection[] = [
  {
    category: "고객",
    items: [
      { label: "사업 목표 및 성공 요인 분석이 충분했는가?", score: "", reason: "" },
      { label: "고객의 불편사항(pain point) 분석과 그에 대한 해결방안 제시가 충분했는가?", score: "", reason: "" },
      { label: "고객의 니즈 및 요구 사항을 정확하게 분석하였는가?", score: "", reason: "" },
      { label: "고객의 장기 비전 및 발전 계획을 충분히 반영했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "경쟁사",
    items: [
      { label: "경쟁사의 제안 전략과 차별화 요소 분석이 충실했는가?", score: "", reason: "" },
      { label: "시장 환경 변화 또는 산업 규제나 정부 정책 이슈를 충실히 반영했는가?", score: "", reason: "" },
      { label: "당사는 경쟁사보다 고객사와 깊은 관계나 장기간의 레퍼런스를 보유하고 있는가?", score: "", reason: "" },
      { label: "고객이 당사를 경쟁사보다 선호하거나 우위에 있다고 판단했을 가능성이 있는가?", score: "", reason: "" },
    ],
  },
  {
    category: "제품 및 기술",
    items: [
      { label: "RFP의 핵심 기능 또는 요구사항을 완벽하게 충족하는가?", score: "", reason: "" },
      { label: "경쟁사 대비 당사 제품 또는 기술적 우위가 충분히 표현되었는가?", score: "", reason: "" },
      { label: "PM 및 주요 투입 인력 구성이 적절했는가?", score: "", reason: "" },
      { label: "리스크 식별과 그에 대한 대응 방안 제시가 충실했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "제안서 및 제안 발표 자료",
    items: [
      { label: "제안서 및 제안 발표 자료는 핵심 내용을 충실히 담고 있는가?", score: "", reason: "" },
      { label: "제안서 및 제안 발표 자료는 가독성이 충분하고, 디자인적으로도 만족스러운가?", score: "", reason: "" },
      { label: "제안서 및 제안 발표 자료의 분량은 적절했는가?", score: "", reason: "" },
      { label: "제안서 및 제안 발표 자료 준비 과정에 충분한 시간과 자원을 투입했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "제안 발표",
    items: [
      { label: "PM은 제안서 작성 개시 시점부터 제안서 작성 과정 전체에 참여했는가?", score: "", reason: "" },
      { label: "PM은 제안 발표 자료 작성 또는 수정 과정에 충분히 참여했는가?", score: "", reason: "" },
      { label: "PM은 RFP와 제안 내용을, 고객 및 경쟁사에 대해 충분히 이해했는가?", score: "", reason: "" },
      { label: "PM의 제안 발표 리허설은 충분히 이뤄졌는가?", score: "", reason: "" },
      { label: "PM은 준비한 것과 동일 수준 이상으로 제안 발표를 수행했는가?", score: "", reason: "" },
      { label: "PM은 고객의 질문에 적절하게 대응했는가?", score: "", reason: "" },
    ],
  },
  {
    category: "영업",
    items: [
      { label: "영업대표는 제안서 작성 과정 전체에 충분히 참여했는가?", score: "", reason: "" },
      { label: "영업대표와 고객과의 신뢰 관계 형성 및 커뮤니케이션은 충분했는가?", score: "", reason: "" },
      { label: "영업대표는 RFP와 제안 내용, 고객 및 경쟁사에 대해 충분히 이해했는가?", score: "", reason: "" },
      { label: "입찰 결과 발표 후 고객사의 평가 의견이나 피드백은 충실히 수집되었는가?", score: "", reason: "" },
    ],
  },
]

function normalizeLookupText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.()/]/g, "")
}

function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  return response.json().then((payload: ApiResponse<T>) => {
    if (!response.ok || payload?.result !== "SUCCESS" || payload.data == null) {
      throw new Error(payload?.message || fallbackMessage)
    }

    return payload.data
  })
}

async function parseApiVoidResponse(response: Response, fallbackMessage: string): Promise<void> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null
  if (!response.ok || payload?.result !== "SUCCESS") {
    throw new Error(payload?.message || fallbackMessage)
  }
}

async function fetchCurrentUserId() {
  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/user/me`, {
      headers: buildAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    })

    const payload = await parseApiResponse<BackendMyInfoResponse>(response, "현재 사용자 정보를 불러오지 못했습니다.")
    return payload.userId ?? currentUser.id
  } catch {
    return currentUser.id
  }
}

async function fetchBidResultList() {
  const response = await fetch(`${getBackendApiBaseUrl()}/bid-results?size=${BID_RESULT_LIST_SIZE}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  const payload = await parseApiResponse<BackendPage<BackendBidResultListItem>>(response, "입찰 결과 목록을 불러오지 못했습니다.")
  return payload.content ?? []
}

async function fetchBidResultDetail(id: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/bid-results/${id}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendBidResultDetailResponse>(response, "입찰 결과 상세를 불러오지 못했습니다.")
}

async function fetchBidResultHistoryList(id: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/bid-results/${id}/histories`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendBidResultHistoryListItem[]>(response, "입찰결과 변경 이력을 불러오지 못했습니다.")
}

async function fetchBidResultHistoryDetail(historyId: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/bid-results/histories/${historyId}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendBidResultHistoryResponse>(response, "입찰결과 변경 이력 상세를 불러오지 못했습니다.")
}

async function fetchBidResultPrefill(proposalId: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/bid-results/pre-fill?proposalId=${proposalId}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendBidResultPrefillResponse>(response, "입찰 결과 기본 정보를 불러오지 못했습니다.")
}

async function fetchUsers() {
  const response = await fetch(`${getBackendApiBaseUrl()}/user`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as ApiResponse<
    BackendUserSummary[] | BackendPage<BackendUserSummary>
  > | null
  if (!response.ok || payload?.result !== "SUCCESS" || payload.data == null) {
    throw new Error(payload?.message || "사용자 목록을 불러오지 못했습니다.")
  }

  return Array.isArray(payload.data) ? payload.data : payload.data.content ?? []
}

function formatDate(value?: string | null) {
  if (!value) return ""
  return value.slice(0, 10)
}

function formatMoney(value?: number | string | null) {
  if (value == null || value === "") return ""
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("ko-KR") : ""
  }

  const normalized = String(value).trim()
  if (!normalized) return ""

  const numeric = Number.parseFloat(normalized.replace(/[^\d.-]/g, ""))
  if (Number.isNaN(numeric)) return normalized

  return numeric.toLocaleString("ko-KR")
}

function parseMoney(value?: string | number | null) {
  if (typeof value === "number") return value
  if (!value) return null
  const parsed = Number.parseFloat(String(value).replace(/[^\d.-]/g, ""))
  return Number.isNaN(parsed) ? null : parsed
}

function parseScore(value?: string | number | null) {
  if (typeof value === "number") return value
  if (!value) return 0
  const parsed = Number.parseFloat(String(value).replace(/[^\d.-]/g, ""))
  return Number.isNaN(parsed) ? 0 : parsed
}

function mapProposalTypeToDisplay(value?: string) {
  if (value === "SI") return "SI 제안"
  return "자체 제안"
}

function mapProposalTypeToBackend(value?: string) {
  if (value === "SI 제안") return "SI"
  if (value === "자체 제안") return "SELF"
  return undefined
}

function mapBidOutcomeToDisplay(value?: string) {
  if (value === "WIN") return "수주"
  if (value === "LOSS") return "실주"
  if (value === "수주" || value === "실주") return value
  return "실주"
}

function mapBidOutcomeToBackend(value?: string) {
  if (value === "수주") return "WIN"
  return "LOSS"
}

function mapDisclosureStatusToDisplay(value?: string) {
  if (value === "PUBLIC") return "공개"
  if (value === "PRIVATE") return "비공개"
  if (value === "공개" || value === "비공개") return value
  return "비공개"
}

function mapDisclosureStatusToBackend(value?: string) {
  if (value === "공개") return "PUBLIC"
  return "PRIVATE"
}

function mapAnalysisCategoryToBackend(value?: string) {
  if (value === "고객") return "CUSTOMER"
  if (value === "경쟁사") return "COMPETITOR"
  if (value === "제품 및 기술") return "PRODUCT_AND_TECH"
  if (value === "제안서 및 제안 발표 자료") return "PROPOSAL_MATERIAL"
  if (value === "제안 발표") return "PRESENTATION"
  if (value === "영업") return "SALES"
  return "CUSTOMER"
}

function mapAnalysisCategoryToDisplay(value?: string) {
  if (value === "CUSTOMER") return "고객"
  if (value === "COMPETITOR") return "경쟁사"
  if (value === "PRODUCT_AND_TECH") return "제품 및 기술"
  if (value === "PROPOSAL_MATERIAL") return "제안서 및 제안 발표 자료"
  if (value === "PRESENTATION") return "제안 발표"
  if (value === "SALES") return "영업"
  return "고객"
}

function findCustomerAndOpportunity(
  findingData: FindingBackendData,
  customerCode?: string,
  customerName?: string,
  opportunityCode?: string,
  opportunityName?: string,
) {
  const normalizedCustomerCode = normalizeLookupText(customerCode)
  const normalizedCustomerName = normalizeLookupText(customerName)
  const normalizedOpportunityCode = normalizeLookupText(opportunityCode)
  const normalizedOpportunityName = normalizeLookupText(opportunityName)

  const opportunity = findingData.opportunities.find((item) => {
    if (normalizedOpportunityCode && normalizeLookupText(item.id) === normalizedOpportunityCode) return true
    if (normalizedOpportunityName && normalizeLookupText(item.name) === normalizedOpportunityName) return true
    if (normalizedCustomerCode && normalizeLookupText(item.customerCode) === normalizedCustomerCode) {
      return Boolean(normalizedOpportunityName && normalizeLookupText(item.name) === normalizedOpportunityName)
    }
    if (normalizedCustomerName && normalizeLookupText(item.customer) === normalizedCustomerName) {
      return Boolean(normalizedOpportunityName && normalizeLookupText(item.name) === normalizedOpportunityName)
    }
    return false
  }) ?? null

  const customer = findingData.customers.find((item) => {
    if (normalizedCustomerCode && normalizeLookupText(item.id) === normalizedCustomerCode) return true
    if (normalizedCustomerName && normalizeLookupText(item.name) === normalizedCustomerName) return true
    return false
  }) ?? null

  return {
    customer,
    opportunity,
  }
}

function findUserId(users: BackendUserSummary[], values: Array<string | undefined | null>) {
  for (const value of values) {
    const normalized = normalizeLookupText(value)
    if (!normalized) continue

    const matched = users.find((user) => {
      if (normalizeLookupText(user.id) === normalized) return true
      if (normalizeLookupText(user.name) === normalized) return true
      return normalizeLookupText(user.email) === normalized
    })

    if (matched?.id) {
      return matched.id
    }
  }

  return ""
}

function buildAnalysisSections(
  analyses?: BackendWinLossAnalysis[],
) {
  return analysisSectionTemplate.map((section) => {
    const sectionAnalyses = (analyses ?? []).filter((item) => mapAnalysisCategoryToDisplay(item.category) === section.category)

    return {
      category: section.category,
      items: section.items.map((templateItem, index) => {
        const matched = sectionAnalyses.find((item) => item.evaluationItem === templateItem.label) ?? null

        return {
          label: templateItem.label,
          score: matched?.score != null ? String(matched.score) : "",
          reason: matched?.reason ?? "",
        }
      }),
    }
  })
}

function buildCompetitorRows(
  ourCompanyScore?: BackendCompanyScore | null,
  competitorScores?: BackendCompanyScore[],
) {
  const ourLabel = "당사"
  const ownTechnical = ourCompanyScore?.technicalScore ?? 0
  const ownPrice = ourCompanyScore?.priceScore ?? 0

  const competitorRows = (competitorScores ?? []).map((item, index) => {
    const technical = item.technicalScore ?? 0
    const price = item.priceScore ?? 0

    return {
      label: item.companyName ?? `경쟁사${index + 1}`,
      technicalScore: String(technical),
      priceScore: String(price),
      totalScore: String(technical + price),
    }
  })

  return [
    {
      label: ourLabel,
      technicalScore: String(ownTechnical),
      priceScore: String(ownPrice),
      totalScore: String(ownTechnical + ownPrice),
    },
    ...competitorRows,
  ]
}

function buildBackendCompetitorScores(competitors: BidResultCompetitorScore[]) {
  return competitors
    .slice(1)
    .map((item) => ({
      companyName: item.label.trim(),
      technicalScore: parseScore(item.technicalScore),
      priceScore: parseScore(item.priceScore),
    }))
    .filter((item) => item.companyName)
}

function buildBackendOurCompanyScore(competitors: BidResultCompetitorScore[]) {
  const ourCompany = competitors[0]
  return {
    companyName: ourCompany?.label?.trim() || "당사",
    technicalScore: parseScore(ourCompany?.technicalScore),
    priceScore: parseScore(ourCompany?.priceScore),
  }
}

function buildBackendAnalyses(sheet: BidResultAnalysisSheet) {
  return (sheet.checklistSections ?? []).flatMap((section) =>
    (section.items ?? [])
      .map((item) => ({
        category: mapAnalysisCategoryToBackend(section.category),
        evaluationItem: item.label.trim(),
        score: parseScore(item.score),
        reason: item.reason?.trim() || null,
      }))
      .filter((item) => item.evaluationItem && item.score >= 1 && item.score <= 5),
  )
}

function parseNumericId(value?: string) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

function buildAnalysisSheetFromBackend(
  detail: BackendBidResultDetailResponse,
) {
  const ourCompanyScore = detail.ourCompanyScore ?? null
  const competitorScores = detail.competitorScores ?? []
  const productModules = (detail.productModules ?? []).map((item) => item.productName).filter((value): value is string => Boolean(value))
  const sections = buildAnalysisSections(detail.analyses)
  const competitors = buildCompetitorRows(ourCompanyScore, competitorScores)

  return {
    bidOverviewCustomerName: detail.customerCompanyName ?? "",
    bidOverviewProjectName: detail.opportunityName ?? "",
    proposalProductModule: productModules.join(", "),
    budget: formatMoney(detail.budget),
    bidAnnouncementDate: formatDate(detail.bidAnnouncementDate),
    proposalSubmissionDeadline: formatDate(detail.proposalDeadline),
    proposalPresentationDate: formatDate(detail.presentationDate),
    externalPdRequired: detail.isExternalPdInvolved ? "예" : "아니오",
    salesLeaderName: detail.salesRepresentativeName ?? "",
    pmName: detail.projectManagerName ?? "",
    proposalParticipants: "",
    keySuccessFactors: detail.keySuccessFactors ?? "",
    rfpIssues: detail.rfpIssues ?? "",
    proposalStrategy: detail.proposalStrategy ?? "",
    scoreDisclosure: mapDisclosureStatusToDisplay(detail.disclosureStatus),
    technicalRatio: "",
    priceRatio: "",
    competitors,
    checklistSections: sections,
  }
}

function mapBidResultSummary(
  item: BackendBidResultListItem,
  proposals: ProposalRecord[],
  findingData: FindingBackendData,
): BidResultRecord {
  const { customer, opportunity } = findCustomerAndOpportunity(
    findingData,
    undefined,
    item.customerCompanyName ?? undefined,
    undefined,
    item.opportunityName ?? undefined,
  )

  const linkedProposal =
    proposals.find((proposal) => {
      if (item.opportunityName && normalizeLookupText(proposal.opportunity) === normalizeLookupText(item.opportunityName)) {
        return true
      }
      if (item.customerCompanyName && normalizeLookupText(proposal.customer) === normalizeLookupText(item.customerCompanyName)) {
        return true
      }
      if (opportunity?.id && proposal.opportunityCode === opportunity.id) return true
      if (customer?.id && proposal.customerCode === customer.id) return true
      return false
    }) ?? null

  const proposalId = linkedProposal?.id ?? String(item.id ?? "")
  const requestId = linkedProposal?.requestId ?? proposalId
  const proposalType = (linkedProposal?.proposalType ?? "자체 제안") as "자체 제안" | "SI 제안"
  const productGroup = (linkedProposal?.productGroup ?? "EMS") as ProposalProductGroup
  const salesRep = item.salesRepresentativeName ?? linkedProposal?.salesRep ?? currentUser.name
  const createdAt = item.createdAt ?? new Date().toISOString()
  const mappedSheet = buildAnalysisSheetFromBackend({
    id: item.id,
    budget: null,
    isExternalPdInvolved: false,
    keySuccessFactors: "",
    rfpIssues: "",
    proposalStrategy: "",
    bidOutcome: item.bidOutcome,
    disclosureStatus: undefined,
    bidAnnouncementDate: item.createdAt,
    presentationDate: undefined,
    salesRepresentativeName: item.salesRepresentativeName,
    projectManagerName: undefined,
    opportunityCode: item.opportunityName,
    opportunityName: item.opportunityName,
    customerCompanyCode: item.customerCompanyName,
    customerCompanyName: item.customerCompanyName,
    proposalId: linkedProposal?.id ? Number.parseInt(linkedProposal.id, 10) : undefined,
    proposalDeadline: item.proposalDeadline,
    productModules: [],
    ourCompanyScore: null,
    competitorScores: [],
    analyses: [],
  })

  return {
    id: String(item.id ?? proposalId ?? `BID-${Date.now()}`),
    proposalId,
    requestId,
    customerCode: customer?.id ?? linkedProposal?.customerCode ?? "",
    customer: item.customerCompanyName ?? customer?.name ?? linkedProposal?.customer ?? "",
    opportunityCode: opportunity?.id ?? linkedProposal?.opportunityCode ?? "",
    opportunity: item.opportunityName ?? opportunity?.name ?? linkedProposal?.opportunity ?? "",
    proposalType,
    productGroup,
    proposalDeadline: formatDate(linkedProposal?.proposalDeadline ?? item.proposalDeadline),
    salesRep,
    bidDate: formatDate(item.createdAt ?? item.proposalDeadline),
    result: mapBidOutcomeToDisplay(item.bidOutcome),
    amount: "",
    competitor: "",
    reason: "",
    analysisSheet: mappedSheet,
    attachments: [],
    attachmentNames: [],
    createdAt,
    updatedAt: createdAt,
  }
}

function mapBidResultDetail(
  detail: BackendBidResultDetailResponse,
  proposals: ProposalRecord[],
  findingData: FindingBackendData,
): BidResultRecord {
  const opportunity = findingData.opportunities.find((item) => {
    if (detail.opportunityCode && normalizeLookupText(item.id) === normalizeLookupText(detail.opportunityCode)) return true
    if (detail.opportunityName && normalizeLookupText(item.name) === normalizeLookupText(detail.opportunityName)) return true
    return false
  }) ?? null

  const customer = findingData.customers.find((item) => {
    if (detail.customerCompanyCode && normalizeLookupText(item.id) === normalizeLookupText(detail.customerCompanyCode)) return true
    if (detail.customerCompanyName && normalizeLookupText(item.name) === normalizeLookupText(detail.customerCompanyName)) return true
    return false
  }) ?? null

  const linkedProposal =
    proposals.find((proposal) => {
      if (detail.proposalId != null && proposal.id === String(detail.proposalId)) return true
      if (detail.opportunityName && normalizeLookupText(proposal.opportunity) === normalizeLookupText(detail.opportunityName)) return true
      if (detail.customerCompanyName && normalizeLookupText(proposal.customer) === normalizeLookupText(detail.customerCompanyName)) return true
      if (opportunity?.id && proposal.opportunityCode === opportunity.id) return true
      if (customer?.id && proposal.customerCode === customer.id) return true
      return false
    }) ?? null

  const mappedSheet = buildAnalysisSheetFromBackend(detail)
  const proposalId = linkedProposal?.id ?? String(detail.proposalId ?? detail.id ?? "")
  const requestId = linkedProposal?.requestId ?? proposalId
  const createdAt = detail.bidAnnouncementDate ?? detail.presentationDate ?? new Date().toISOString()

  return {
    id: String(detail.id ?? proposalId ?? `BID-${Date.now()}`),
    workflowId: detail.workflowId,
    workflowStatus: detail.status ?? undefined,
    proposalId,
    requestId,
    customerCode: detail.customerCompanyCode ?? customer?.id ?? linkedProposal?.customerCode ?? "",
    customer: detail.customerCompanyName ?? customer?.name ?? linkedProposal?.customer ?? "",
    opportunityCode: detail.opportunityCode ?? opportunity?.id ?? linkedProposal?.opportunityCode ?? "",
    opportunity: detail.opportunityName ?? opportunity?.name ?? linkedProposal?.opportunity ?? "",
    proposalType: (linkedProposal?.proposalType ?? "자체 제안") as "자체 제안" | "SI 제안",
    productGroup: (linkedProposal?.productGroup ?? mappedSheet.proposalProductModule?.split(",")[0]?.trim() ?? "EMS") as ProposalProductGroup,
    proposalDeadline: formatDate(detail.proposalDeadline ?? linkedProposal?.proposalDeadline),
    salesRep: detail.salesRepresentativeName ?? linkedProposal?.salesRep ?? currentUser.name,
    bidDate: formatDate(detail.bidAnnouncementDate ?? detail.presentationDate ?? linkedProposal?.proposalDeadline),
    result: mapBidOutcomeToDisplay(detail.bidOutcome),
    amount: formatMoney(detail.budget),
    competitor: (detail.competitorScores ?? []).map((item) => item.companyName).filter(Boolean).join(", "),
    reason: detail.keySuccessFactors || "",
    analysisSheet: mappedSheet,
    attachments: [],
    attachmentNames: [],
    createdAt,
    updatedAt: createdAt,
  }
}

export async function loadBackendBidResults() {
  const [findingData, proposals, backendItems] = await Promise.all([
    loadBackendFindingData(),
    loadBackendProposals(),
    fetchBidResultList(),
  ])

  return backendItems.map((item) => mapBidResultSummary(item, proposals, findingData))
}

export async function loadBackendBidResultDetailById(id: string) {
  const numericId = Number.parseInt(id, 10)
  if (Number.isNaN(numericId)) {
    throw new Error("입찰 결과 ID가 올바르지 않습니다.")
  }

  const [findingData, proposals, detail] = await Promise.all([
    loadBackendFindingData(),
    loadBackendProposals(),
    fetchBidResultDetail(numericId),
  ])

  return mapBidResultDetail(detail, proposals, findingData)
}

export async function loadBackendBidResultHistoryRecords(bidResultId: string) {
  return fetchBidResultHistoryList(bidResultId)
}

export async function loadBackendBidResultHistoryRecord(historyId: number) {
  const [findingData, proposals, detail] = await Promise.all([
    loadBackendFindingData(),
    loadBackendProposals(),
    fetchBidResultHistoryDetail(historyId),
  ])

  return mapBidResultDetail(
    { ...detail, id: detail.bidResultId ?? detail.id } as BackendBidResultDetailResponse,
    proposals,
    findingData,
  )
}

export async function loadBackendBidResultPrefillByProposalId(proposalId: string) {
  const numericId = Number.parseInt(proposalId, 10)
  if (Number.isNaN(numericId)) {
    throw new Error("제안서 ID가 올바르지 않습니다.")
  }

  return fetchBidResultPrefill(numericId)
}

function toBidOutcome(value?: string) {
  if (value === "수주") return "WIN"
  return "LOSS"
}

function toDisclosureStatus(value?: string) {
  if (value === "공개") return "PUBLIC"
  return "PRIVATE"
}

function findMatchingProposal(
  input: BidResultSaveInput,
  proposals: ProposalRecord[],
  findingData: FindingBackendData,
) {
  const linkedOpportunity = findingData.opportunities.find((item) => {
    if (input.opportunityCode && normalizeLookupText(item.id) === normalizeLookupText(input.opportunityCode)) return true
    if (input.opportunity && normalizeLookupText(item.name) === normalizeLookupText(input.opportunity)) return true
    if (input.customerCode && normalizeLookupText(item.customerCode) === normalizeLookupText(input.customerCode)) {
      return Boolean(input.opportunity && normalizeLookupText(item.name) === normalizeLookupText(input.opportunity))
    }
    if (input.customer && normalizeLookupText(item.customer) === normalizeLookupText(input.customer)) {
      return Boolean(input.opportunity && normalizeLookupText(item.name) === normalizeLookupText(input.opportunity))
    }
    return false
  }) ?? null

  return (
    proposals.find((proposal) => {
      if (input.proposalId && proposal.id === input.proposalId) return true
      if (linkedOpportunity?.id && proposal.opportunityCode === linkedOpportunity.id) return true
      if (input.opportunityCode && proposal.opportunityCode === input.opportunityCode) return true
      if (input.customerCode && proposal.customerCode === input.customerCode) return true
      if (input.customer && normalizeLookupText(proposal.customer) === normalizeLookupText(input.customer)) return true
      if (input.opportunity && normalizeLookupText(proposal.opportunity) === normalizeLookupText(input.opportunity)) return true
      return false
    }) ?? null
  )
}

async function resolveProjectOpportunityId(
  input: BidResultSaveInput,
  proposals: ProposalRecord[],
  findingData: FindingBackendData,
) {
  const linkedProposal = findMatchingProposal(input, proposals, findingData)
  const candidateOpportunityCode = input.opportunityCode || linkedProposal?.opportunityCode || ""
  const candidateOpportunityName = input.opportunity || linkedProposal?.opportunity || ""
  const candidateCustomerCode = input.customerCode || linkedProposal?.customerCode || ""
  const candidateCustomerName = input.customer || linkedProposal?.customer || ""

  const opportunity = findingData.opportunities.find((item) => {
    if (item.backendId != null && input.requestId && normalizeLookupText(item.id) === normalizeLookupText(input.requestId)) return true
    if (candidateOpportunityCode && normalizeLookupText(item.id) === normalizeLookupText(candidateOpportunityCode)) return true
    if (candidateOpportunityName && normalizeLookupText(item.name) === normalizeLookupText(candidateOpportunityName)) return true
    if (candidateCustomerCode && normalizeLookupText(item.customerCode) === normalizeLookupText(candidateCustomerCode)) {
      return Boolean(candidateOpportunityName && normalizeLookupText(item.name) === normalizeLookupText(candidateOpportunityName))
    }
    if (candidateCustomerName && normalizeLookupText(item.customer) === normalizeLookupText(candidateCustomerName)) {
      return Boolean(candidateOpportunityName && normalizeLookupText(item.name) === normalizeLookupText(candidateOpportunityName))
    }
    return false
  }) ?? null

  return opportunity?.backendId ?? null
}

async function resolveSalesRepresentativeId(
  input: BidResultSaveInput,
  users: BackendUserSummary[],
) {
  const candidate = findUserId(users, [input.salesRep, input.analysisSheet?.salesLeaderName, currentUser.name, currentUser.email, currentUser.id])
  if (candidate) return candidate
  return fetchCurrentUserId()
}

async function resolveProjectManagerId(
  input: BidResultSaveInput,
  users: BackendUserSummary[],
) {
  const candidate = findUserId(users, [input.analysisSheet?.pmName])
  return candidate || ""
}

function buildRequestPayload(
  input: BidResultSaveInput,
  projectOpportunityId: number,
  salesRepresentativeId: string,
  projectManagerId?: string,
) {
  const sheet = input.analysisSheet
  const budget = parseMoney(sheet.budget) ?? parseMoney(input.amount)
  const competitorRows = sheet.competitors ?? []
  const ourCompanyScore = buildBackendOurCompanyScore(competitorRows)
  const competitorScores = buildBackendCompetitorScores(competitorRows)
  const analyses = buildBackendAnalyses(sheet)

  return {
    projectOpportunityId,
    proposalId: parseNumericId(input.proposalId),
    salesRepresentativeId,
    projectManagerId: projectManagerId || undefined,
    budget,
    isExternalPdInvolved: /^(예|y|yes|true|1|o|있음|필요)$/i.test(String(sheet.externalPdRequired ?? "").trim()),
    keySuccessFactors: input.reason || sheet.keySuccessFactors || null,
    rfpIssues: sheet.rfpIssues || null,
    proposalStrategy: sheet.proposalStrategy || null,
    bidOutcome: toBidOutcome(input.result),
    disclosureStatus: toDisclosureStatus(sheet.scoreDisclosure),
    bidAnnouncementDate: sheet.bidAnnouncementDate || input.bidDate || undefined,
    presentationDate: sheet.proposalPresentationDate || undefined,
    ourCompanyScore,
    competitorScores,
    analyses,
  }
}

function mergeSavedRecord(
  saved: BackendBidResultDetailResponse,
  input: BidResultSaveInput,
  proposals: ProposalRecord[],
  findingData: FindingBackendData,
) {
  const detailRecord = mapBidResultDetail(saved, proposals, findingData)

  return {
    ...detailRecord,
    id: String(saved.id ?? detailRecord.id),
    proposalId: detailRecord.proposalId || input.proposalId || "",
    requestId: detailRecord.requestId || input.requestId || "",
    customerCode: input.customerCode || detailRecord.customerCode,
    customer: input.customer || detailRecord.customer,
    opportunityCode: input.opportunityCode || detailRecord.opportunityCode,
    opportunity: input.opportunity || detailRecord.opportunity,
    proposalType: (input.proposalType || detailRecord.proposalType || "자체 제안") as "자체 제안" | "SI 제안",
    productGroup: (input.productGroup || detailRecord.productGroup || "EMS") as ProposalProductGroup,
    proposalDeadline: input.proposalDeadline || detailRecord.proposalDeadline,
    salesRep: input.salesRep || detailRecord.salesRep,
    bidDate: input.bidDate || detailRecord.bidDate,
    result: input.result,
    amount: input.amount || detailRecord.amount,
    competitor: input.competitor || detailRecord.competitor,
    reason: input.reason || detailRecord.reason,
    analysisSheet: input.analysisSheet,
    attachments: [],
    attachmentNames: [],
    createdAt: detailRecord.createdAt,
    updatedAt: detailRecord.updatedAt,
  } satisfies BidResultRecord
}

export async function saveBackendBidResult(input: BidResultSaveInput) {
  const [findingData, proposals, users] = await Promise.all([
    loadBackendFindingData(),
    loadBackendProposals(),
    fetchUsers(),
  ])

  const projectOpportunityId = await resolveProjectOpportunityId(input, proposals, findingData)

  if (projectOpportunityId == null) {
    throw new Error("연결할 사업기회를 찾지 못했습니다.")
  }

  const salesRepresentativeId = await resolveSalesRepresentativeId(input, users)
  if (!salesRepresentativeId) {
    throw new Error("현재 사용자에 매핑되는 백엔드 사용자 ID를 찾지 못했습니다.")
  }

  const projectManagerId = await resolveProjectManagerId(input, users)
  const payload = buildRequestPayload(input, projectOpportunityId, salesRepresentativeId, projectManagerId)
  const hasNumericId = Boolean(input.id && Number.isFinite(Number(input.id)))
  const response = await fetch(
    hasNumericId ? `${getBackendApiBaseUrl()}/bid-results/${input.id}` : `${getBackendApiBaseUrl()}/bid-results`,
    {
      method: hasNumericId ? "PUT" : "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(payload),
    },
  )

  const saved = await parseApiResponse<BackendBidResultDetailResponse>(response, hasNumericId ? "입찰 결과를 저장하지 못했습니다." : "입찰 결과를 등록하지 못했습니다.")
  return mergeSavedRecord(saved, input, proposals, findingData)
}

export async function deleteBackendBidResult(id: string) {
  const isNumericId = Number.isFinite(Number(id))
  if (isNumericId) {
    const response = await fetch(`${getBackendApiBaseUrl()}/bid-results/${id}`, {
      method: "DELETE",
      headers: buildAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    })

    await parseApiVoidResponse(response, "입찰 결과를 삭제하지 못했습니다.")
  }

  return true
}
