"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { currentUser } from "@/lib/current-user"
import { getCustomerByName, getOpportunitiesByCustomerName } from "@/lib/finding-data"
import { getRfpAnalyses, replaceRfpAnalyses, type RfpAnalysisRecord } from "@/lib/bid-data"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type BackendPage<T> = {
  content?: T[]
}

type BackendMyInfo = {
  userId?: string
  name?: string
  email?: string
}

type BackendProjectOpportunity = {
  id?: number
  opportunityCode?: string
  opportunityName?: string
  customerCompanyName?: string
  projectType?: string
  productModules?: { productModule?: { productName?: string } }[]
}

type BackendRfpRequirement = {
  id?: number
  category?: string
  requirementCode?: string
  name?: string
  description?: string
  supportType?: string
  reviewComment?: string
  effort?: number | string | null
}

type BackendRfpSummary = {
  id?: number
  projectName?: string
  requesterName?: string
  assigneeName?: string
  assigneeId?: string
  requestDate?: string
  deadline?: string
  status?: string
  projectOpportunityId?: number
  customerCompanyName?: string
  proposalDeadline?: string
  projectType?: string
  proposalType?: string
  hardwareProvider?: string
  budgetAmount?: number | string | null
  expectedDuration?: string
  projectLocation?: string
  projectDescription?: string
  requirements?: BackendRfpRequirement[]
}

type BackendRfpDetail = BackendRfpSummary & {
  hardwareProvider?: string
  budgetAmount?: number | string | null
  expectedDuration?: string
  projectLocation?: string
  proposalDeadline?: string
  projectDescription?: string
  proposalType?: string
  assigneeId?: string
  assigneeName?: string
  projectOpportunityId?: number
  customerCompanyName?: string
  projectType?: string
  productModules?: string[]
  salesRepresentativeId?: string
  salesRepresentativeName?: string
  requirements?: BackendRfpRequirement[]
}

type BackendRfpUpsertRequest = {
  projectName: string
  hardwareProvider?: string
  budgetAmount?: number | null
  expectedDuration?: string
  projectLocation?: string
  proposalDeadline?: string
  projectDescription?: string
  proposalType?: "SI" | "SELF"
  assigneeId: string
  projectOpportunityId: number
  requirements?: Array<{
    category?: string
    requirementCode?: string
    name?: string
    description?: string
    supportType?: "PROVIDED" | "NOT_PROVIDED" | "PARTIAL_CUSTOMIZATION" | "NEEDS_REVIEW"
    reviewComment?: string
    effort?: number | null
  }>
}

const RFP_LIST_SIZE = 2000
const RFP_BACKEND_FALLBACK_MESSAGE = "RFP 분석 API 연동에 실패했습니다."

function isBrowser() {
  return typeof window !== "undefined"
}

function parseNumber(value?: string | number | null) {
  if (typeof value === "number") return value
  if (!value) return null
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ""))
  return Number.isNaN(parsed) ? null : parsed
}

function parseDateTime(value?: string) {
  if (!value) return undefined
  if (value.includes("T")) return value
  return `${value}T00:00:00`
}

function normalizeLookupText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.()/]/g, "")
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage)
  }

  if (payload?.result !== "SUCCESS" || payload.data == null) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload.data
}

async function fetchMyInfo() {
  const response = await fetch(`${getBackendApiBaseUrl()}/user/me`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendMyInfo>(response, "내 사용자 정보를 불러오지 못했습니다.")
}

async function fetchProjectOpportunities() {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities?size=${RFP_LIST_SIZE}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  type ApiData = BackendPage<BackendProjectOpportunity>
  const payload = await parseApiResponse<ApiData>(response, "사업기회 목록을 불러오지 못했습니다.")
  return payload.content ?? []
}

async function fetchRfpList() {
  const response = await fetch(`${getBackendApiBaseUrl()}/rfp-analyze-results?size=${RFP_LIST_SIZE}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  type ApiData = BackendPage<BackendRfpSummary>
  const payload = await parseApiResponse<ApiData>(response, "RFP 분석 목록을 불러오지 못했습니다.")
  return payload.content ?? []
}

async function fetchRfpDetail(id: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/rfp-analyze-results/${id}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendRfpDetail>(response, "RFP 분석 상세를 불러오지 못했습니다.")
}

function mapSupportTypeToStatus(value?: string) {
  if (!value) return "?" as const
  if (value === "PROVIDED") return "O" as const
  if (value === "NOT_PROVIDED") return "X" as const
  if (value === "PARTIAL_CUSTOMIZATION") return "∆" as const
  if (value === "NEEDS_REVIEW") return "?" as const
  return "?" as const
}

function mapStatusToBackend(value?: string) {
  if (value === "완료") return "COMPLETED"
  if (value === "분석중") return "ANALYZING"
  return "RECEIVED"
}

function mapStatusToFrontend(value?: string) {
  if (value === "COMPLETED") return "완료"
  if (value === "ANALYZING") return "분석중"
  if (value === "RECEIVED") return "접수"
  return "접수"
}

function mapProposalTypeToBackend(value?: string) {
  return value === "SI 제안" ? "SI" : "SELF"
}

function mapProposalTypeToFrontend(value?: string) {
  if (value === "SI") return "SI 제안"
  if (value === "SELF") return "자체 제안"
  return value ?? "자체 제안"
}

function mapProjectTypeToFrontend(value?: string) {
  return value ?? "EMS"
}

function mapRequirements(value?: BackendRfpRequirement[]) {
  return (value ?? []).map((item, index) => ({
    id: String(item.id ?? `RFPR-${index + 1}`),
    category: item.category ?? "",
    requirementCode: item.requirementCode ?? "",
    requirementTitle: item.name ?? "",
    requirementContent: item.description ?? "",
    supportStatus: mapSupportTypeToStatus(item.supportType),
    reviewNote: item.reviewComment ?? "",
    effort: item.effort == null ? "" : String(item.effort),
  }))
}

function mapRequirementPayload(requirements: RfpAnalysisRecord["requirements"] | undefined) {
  type RequirementPayload = NonNullable<BackendRfpUpsertRequest["requirements"]>[number]

  return (requirements ?? []).map((item): RequirementPayload => ({
    category: item.category || "",
    requirementCode: item.requirementCode || "",
    name: item.requirementTitle || "",
    description: item.requirementContent || "",
    supportType:
      item.supportStatus === "O"
        ? "PROVIDED"
        : item.supportStatus === "X"
          ? "NOT_PROVIDED"
          : item.supportStatus === "∆"
            ? "PARTIAL_CUSTOMIZATION"
            : "NEEDS_REVIEW",
    reviewComment: item.reviewNote || "",
    effort: parseNumber(item.effort),
  }))
}

function buildLocalLookup() {
  return new Map(getRfpAnalyses().map((item) => [item.id, item]))
}

function buildOpportunityLookup(opportunities: BackendProjectOpportunity[]) {
  return new Map(
    opportunities
      .filter((item) => item.id != null)
      .map((item) => [String(item.id), item] as const),
  )
}

function mapBackendRfpRecord(
  summary: BackendRfpSummary | BackendRfpDetail,
  local: RfpAnalysisRecord | undefined,
  opportunityLookup?: Map<string, BackendProjectOpportunity>,
): RfpAnalysisRecord {
  const linkedOpportunity =
    summary.projectOpportunityId != null ? opportunityLookup?.get(String(summary.projectOpportunityId)) : undefined
  const projectName =
    linkedOpportunity?.opportunityName ?? summary.projectName ?? local?.opportunity ?? ""
  const customerName =
    linkedOpportunity?.customerCompanyName ?? summary.customerCompanyName ?? local?.customer ?? ""
  const opportunityCode =
    linkedOpportunity?.opportunityCode ??
    local?.opportunityCode ??
    (customerName && projectName
      ? getOpportunitiesByCustomerName(customerName).find((item) => normalizeLookupText(item.name) === normalizeLookupText(projectName))?.id ?? ""
      : "")
  const projectOpportunityId = summary.projectOpportunityId ?? linkedOpportunity?.id ?? local?.projectOpportunityId
  const assigneeId = summary.assigneeId ?? local?.assigneeId

  const productModules =
    linkedOpportunity?.productModules && linkedOpportunity.productModules.length > 0
      ? linkedOpportunity.productModules.map((module) => module.productModule?.productName ?? "").filter(Boolean)
      : "productModules" in summary && Array.isArray(summary.productModules)
      ? summary.productModules
      : []

  return {
    id: String(summary.id ?? local?.id ?? `RFP-${Date.now()}`),
    requestId: local?.requestId,
    projectOpportunityId,
    assigneeId,
    customer: customerName,
    customerCode: local?.customerCode ?? getCustomerByName(customerName)?.id ?? "",
    opportunity: projectName,
    opportunityCode,
    requester: summary.requesterName ?? local?.requester ?? currentUser.name,
    analyst: summary.assigneeName ?? local?.analyst ?? currentUser.name,
    receiveDate: summary.requestDate?.slice(0, 10) ?? local?.receiveDate ?? new Date().toISOString().slice(0, 10),
    requestDate: summary.requestDate?.slice(0, 10) ?? local?.requestDate ?? new Date().toISOString().slice(0, 10),
    dueDate: summary.deadline?.slice(0, 10) ?? summary.proposalDeadline?.slice(0, 10) ?? local?.dueDate ?? "",
    status: mapStatusToFrontend(summary.status) as RfpAnalysisRecord["status"],
    businessType: mapProjectTypeToFrontend(linkedOpportunity?.projectType ?? summary.projectType ?? local?.businessType),
    proposalType: mapProposalTypeToFrontend(summary.proposalType ?? local?.proposalType) as RfpAnalysisRecord["proposalType"],
    deliveryModule: productModules.join(", ") || local?.deliveryModule,
    hardwareOwner: summary.hardwareProvider ?? local?.hardwareOwner,
    majorContent: summary.projectDescription ?? local?.majorContent,
    amountScale:
      summary.budgetAmount == null
        ? local?.amountScale
        : Number(summary.budgetAmount).toLocaleString("ko-KR"),
    projectPeriod: summary.expectedDuration ?? local?.projectPeriod,
    businessPlace: summary.projectLocation ?? local?.businessPlace,
    proposalDeadline: summary.proposalDeadline?.slice(0, 10) ?? local?.proposalDeadline,
    requirements: "requirements" in summary ? mapRequirements(summary.requirements) : local?.requirements,
    updatedAt: local?.updatedAt,
  }
}

async function resolveAssigneeId(input?: { assigneeId?: string }) {
  if (input?.assigneeId) {
    return input.assigneeId
  }

  try {
    const myInfo = await fetchMyInfo()
    if (myInfo.userId) {
      return myInfo.userId
    }
  } catch {
    // `/user/me` 실패 시 프론트 세션의 기본 사용자로 우회한다.
  }

  return currentUser.id
}

async function resolveProjectOpportunityId(input: {
  customerName?: string
  opportunityName?: string
  opportunityCode?: string
  projectOpportunityId?: number
}) {
  if (input.projectOpportunityId != null) {
    return input.projectOpportunityId
  }

  const opportunities = await fetchProjectOpportunities()
  const normalizedCustomerName = normalizeLookupText(input.customerName)
  const normalizedOpportunityName = normalizeLookupText(input.opportunityName)
  const normalizedOpportunityCode = normalizeLookupText(input.opportunityCode)

  const matched = opportunities.find((item) => {
    if (normalizedOpportunityCode && normalizeLookupText(item.opportunityCode) === normalizedOpportunityCode) return true
    if (normalizedOpportunityName && normalizeLookupText(item.opportunityName) === normalizedOpportunityName) return true
    if (
      normalizedCustomerName &&
      normalizedOpportunityName &&
      normalizeLookupText(item.customerCompanyName) === normalizedCustomerName &&
      normalizeLookupText(item.opportunityName) === normalizedOpportunityName
    ) {
      return true
    }

    return (
      normalizedCustomerName &&
      normalizedOpportunityName &&
      normalizeLookupText(item.customerCompanyName).includes(normalizedCustomerName) &&
      normalizeLookupText(item.opportunityName).includes(normalizedOpportunityName)
    )
  })

  return matched?.id ?? null
}

async function buildPayload(input: Omit<RfpAnalysisRecord, "id"> & { id?: string }) {
  const projectOpportunityId = await resolveProjectOpportunityId({
    customerName: input.customer,
    opportunityName: input.opportunity,
    opportunityCode: input.opportunityCode,
    projectOpportunityId: input.projectOpportunityId,
  })

  if (projectOpportunityId == null) {
    throw new Error("선택한 고객사/사업기회를 백엔드에서 찾을 수 없습니다.")
  }

  const assigneeId = await resolveAssigneeId({ assigneeId: input.assigneeId })
  const payload: BackendRfpUpsertRequest = {
    projectName: input.opportunity,
    hardwareProvider: input.hardwareOwner || "",
    budgetAmount: parseNumber(input.amountScale),
    expectedDuration: input.projectPeriod || "",
    projectLocation: input.businessPlace || "",
    proposalDeadline: parseDateTime(input.proposalDeadline),
    projectDescription: input.majorContent || "",
    proposalType: mapProposalTypeToBackend(input.proposalType),
    assigneeId,
    projectOpportunityId,
    requirements: mapRequirementPayload(input.requirements),
  }

  return payload
}

function saveSnapshot(records: RfpAnalysisRecord[]) {
  replaceRfpAnalyses(records.sort((a, b) => b.receiveDate.localeCompare(a.receiveDate)))
}

async function loadBackendRecordMap() {
  const localLookup = buildLocalLookup()
  const list = await fetchRfpList()
  const opportunityLookup = buildOpportunityLookup(await fetchProjectOpportunities())
  const details = await Promise.all(
    list.map(async (item) => {
      if (item.id == null) return null
      try {
        return await fetchRfpDetail(item.id)
      } catch {
        return item
      }
    }),
  )

  return details
    .filter((item): item is BackendRfpSummary | BackendRfpDetail => Boolean(item && item.id != null))
    .map((item) => mapBackendRfpRecord(item, localLookup.get(String(item.id)), opportunityLookup))
}

export async function loadBackendRfpAnalyses() {
  const records = await loadBackendRecordMap()
  saveSnapshot(records)
  return records
}

export async function createBackendRfpAnalysis(input: Omit<RfpAnalysisRecord, "id"> & { id?: string }) {
  const payload = await buildPayload(input)
  const response = await fetch(`${getBackendApiBaseUrl()}/rfp-analyze-results`, {
    method: "POST",
    headers: {
      ...buildAuthHeaders(),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  const saved = await parseApiResponse<BackendRfpDetail>(response, RFP_BACKEND_FALLBACK_MESSAGE)
  const merged = mapBackendRfpRecord(saved, {
    ...input,
    id: input.id ?? String(saved.id ?? `RFP-${Date.now()}`),
    updatedAt: new Date().toISOString(),
  } as RfpAnalysisRecord)
  saveSnapshot([merged, ...getRfpAnalyses().filter((item) => item.id !== merged.id)])
  return merged
}

export async function updateBackendRfpAnalysis(id: string, input: Omit<RfpAnalysisRecord, "id"> & { id?: string }) {
  const payload = await buildPayload(input)
  const response = await fetch(`${getBackendApiBaseUrl()}/rfp-analyze-results/${id}`, {
    method: "PUT",
    headers: {
      ...buildAuthHeaders(),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  const saved = await parseApiResponse<BackendRfpDetail>(response, RFP_BACKEND_FALLBACK_MESSAGE)
  const merged = mapBackendRfpRecord(saved, {
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  } as RfpAnalysisRecord)
  saveSnapshot([merged, ...getRfpAnalyses().filter((item) => item.id !== merged.id)])
  return merged
}

export async function deleteBackendRfpAnalysis(id: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/rfp-analyze-results/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  })

  await parseApiResponse<Record<string, unknown>>(response, RFP_BACKEND_FALLBACK_MESSAGE)
  saveSnapshot(getRfpAnalyses().filter((item) => item.id !== id))
  return true
}
