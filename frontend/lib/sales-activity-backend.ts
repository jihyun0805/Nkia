"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { getPresalesUsers } from "@/lib/admin-data"
import type { ActivityRecord } from "@/lib/activity-data"
import { currentUser } from "@/lib/current-user"
import type {
  ApiResponseVoid,
  SalesActivityCreateRequest,
  SalesActivityCreateRequestActivityPurpose,
  SalesActivityCreateRequestActivityType,
  SalesActivityCreateRequestStatus,
  SalesActivityResponse,
  SalesActivityUpdateRequest,
  SalesActivityUpdateRequestActivityPurpose,
  SalesActivityUpdateRequestActivityType,
  SalesActivityUpdateRequestStatus,
} from "@/lib/api/generated/model"
import { loadBackendUsers } from "@/lib/workflow-backend"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type CompanySummaryResponse = {
  id?: number
  code?: string
  name?: string
}

type ProjectOpportunitySummaryResponse = {
  id?: number
  opportunityCode?: string
  opportunityName?: string
  customerCompanyName?: string
}

type BackendUserSummary = {
  id?: string
  employeeNumber?: string
  name?: string
  email?: string
}

type SalesActivityBackendItem = {
  id?: number
  projectOpportunityId?: number
  projectOpportunityName?: string
  companyId?: number
  companyName?: string
  activityType?: string
  activityPurpose?: string
  activityContent?: string
  location?: string
  activityDateTime?: string
  issue?: string
  nextActivity?: string
  customerInterest?: string
  attendeeUserIds?: string[]
  status?: string
  salesActivityRequestId?: number
  salesActivityRequestTitle?: string
}

type ActivityExtraFieldRecord = {
  registrant?: string
  requester?: string
}

const ACTIVITY_EXTRA_FIELDS_STORAGE_KEY = "orbis.activity.extra-fields"

function isBrowser() {
  return typeof window !== "undefined"
}

function readActivityExtraFieldRecords() {
  if (!isBrowser()) return {} as Record<string, ActivityExtraFieldRecord>

  try {
    const stored = window.localStorage.getItem(ACTIVITY_EXTRA_FIELDS_STORAGE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as Record<string, ActivityExtraFieldRecord>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeActivityExtraFieldRecords(records: Record<string, ActivityExtraFieldRecord>) {
  if (!isBrowser()) return
  window.localStorage.setItem(ACTIVITY_EXTRA_FIELDS_STORAGE_KEY, JSON.stringify(records))
}

function saveActivityExtraFields(id: string, fields: ActivityExtraFieldRecord) {
  const current = readActivityExtraFieldRecords()
  current[id] = {
    registrant: fields.registrant ?? "",
    requester: fields.requester ?? "",
  }
  writeActivityExtraFieldRecords(current)
}

function getActivityExtraFields(id: string) {
  return readActivityExtraFieldRecords()[id] ?? {}
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  EMAIL: "이메일",
  CALL: "전화",
  VIDEO_MEETING: "영상회의",
  OFFLINE_MEETING: "대면미팅",
  ETC: "기타",
}

const ACTIVITY_PURPOSE_LABELS: Record<string, string> = {
  CONSULTING: "상담",
  PRODUCT_INTRODUCTION: "제품소개",
  DEMO: "데모",
  POC: "PoC",
  BMT: "BMT",
  DOCUMENT_DELIVERY: "자료 전달",
  RFP_ANALYSIS: "RFP 분석",
  PROPOSAL_WRITING: "제안서 작성",
  SI_PROPOSAL_WRITING: "SI 제안서 작성",
  ETC: "기타",
}

const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "접수대기",
  PLANNED: "예정",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  CANCELED: "삭제",
}

const ACTIVITY_TYPE_TO_ENUM: Record<string, SalesActivityCreateRequestActivityType> = {
  이메일: "EMAIL",
  전화: "CALL",
  영상회의: "VIDEO_MEETING",
  대면미팅: "OFFLINE_MEETING",
  기타: "ETC",
}

const ACTIVITY_PURPOSE_TO_ENUM: Record<string, SalesActivityCreateRequestActivityPurpose> = {
  상담: "CONSULTING",
  제품소개: "PRODUCT_INTRODUCTION",
  데모: "DEMO",
  PoC: "POC",
  BMT: "BMT",
  "자료 전달": "DOCUMENT_DELIVERY",
  "RFP 분석": "RFP_ANALYSIS",
  "제안서 작성": "PROPOSAL_WRITING",
  "SI 제안서 작성": "SI_PROPOSAL_WRITING",
  기타: "ETC",
}

const ACTIVITY_STATUS_TO_ENUM: Record<string, SalesActivityCreateRequestStatus> = {
  접수대기: "REQUESTED",
  예정: "PLANNED",
  진행중: "IN_PROGRESS",
  완료: "COMPLETED",
  삭제: "CANCELED",
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

async function parseVoidApiResponse(response: Response, fallbackMessage: string): Promise<void> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<null> | null

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage)
  }

  if (payload?.result !== "SUCCESS") {
    throw new Error(payload?.message || fallbackMessage)
  }
}

function mapActivityType(activityType?: string) {
  if (!activityType) return "-"
  return ACTIVITY_TYPE_LABELS[activityType] ?? activityType
}

function mapActivityPurpose(activityPurpose?: string) {
  if (!activityPurpose) return "-"
  return ACTIVITY_PURPOSE_LABELS[activityPurpose] ?? activityPurpose
}

function mapActivityStatus(status?: string) {
  if (!status) return "접수대기"
  return ACTIVITY_STATUS_LABELS[status] ?? status
}

function mapActivityTypeToEnum(activityMode: string) {
  return ACTIVITY_TYPE_TO_ENUM[activityMode] ?? "ETC"
}

function mapActivityPurposeToEnum(activityPurpose: string) {
  return ACTIVITY_PURPOSE_TO_ENUM[activityPurpose] ?? "ETC"
}

function mapActivityStatusToEnum(status: string) {
  return ACTIVITY_STATUS_TO_ENUM[status] ?? "COMPLETED"
}

function normalizeLookupText(value: string) {
  return value.trim().toLowerCase()
}

async function resolveAttendeeUserIds(attendees?: string) {
  const tokens = (attendees ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (tokens.length === 0) {
    return []
  }

  let backendUsers: BackendUserSummary[] = []
  try {
    backendUsers = await loadBackendUsers()
  } catch {
    backendUsers = []
  }

  const localUsers: BackendUserSummary[] = getPresalesUsers().map((user) => ({
    id: user.id,
    employeeNumber: user.employeeNumber,
    name: user.name,
    email: user.email,
  }))

  const allUsers: BackendUserSummary[] = [
    ...backendUsers,
    ...localUsers,
    { id: currentUser.id, name: currentUser.name, email: currentUser.email },
  ]

  const resolved = tokens
    .map((token) => {
      const normalized = normalizeLookupText(token)
      const matched = allUsers.find((user) => {
        const userId = user.id?.trim()
        const employeeNumber = user.employeeNumber?.trim()
        const name = user.name?.trim()
        const email = user.email?.trim()

        return (
          (userId && normalizeLookupText(userId) === normalized) ||
          (employeeNumber && normalizeLookupText(employeeNumber) === normalized) ||
          (name && normalizeLookupText(name) === normalized) ||
          (email && normalizeLookupText(email) === normalized)
        )
      })

      return matched?.id?.trim() ?? ""
    })
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(resolved))
}

async function fetchSalesActivities() {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/sales-activities`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<SalesActivityBackendItem[]>(response, "영업 활동 목록을 불러오지 못했습니다.")
}

async function fetchProjectOpportunities() {
  const response = await fetch(`${getBackendApiBaseUrl()}/project-opportunities?size=2000`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  type PageResponse = {
    content?: ProjectOpportunitySummaryResponse[]
  }

  return parseApiResponse<PageResponse>(response, "사업기회 목록을 불러오지 못했습니다.")
}

async function fetchCompanySummary(companyId: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/companies/${companyId}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<CompanySummaryResponse>(response, "회사 정보를 불러오지 못했습니다.")
}

async function resolveProjectOpportunityId(params: {
  projectOpportunityId?: number
  customerName?: string
  opportunityName?: string
  opportunityCode?: string
}) {
  if (params.projectOpportunityId != null) {
    return params.projectOpportunityId
  }

  const opportunities = (await fetchProjectOpportunities()).content ?? []
  const normalizedCustomer = params.customerName?.trim()
  const normalizedOpportunity = params.opportunityName?.trim()
  const normalizedOpportunityCode = params.opportunityCode?.trim()
  const customerMatches = normalizedCustomer
    ? opportunities.filter((item) => item.customerCompanyName?.trim() === normalizedCustomer)
    : []

  const matched = opportunities.find((item) => {
    if (normalizedOpportunityCode && item.opportunityCode === normalizedOpportunityCode) {
      return true
    }

    return (
      normalizedCustomer != null &&
      normalizedOpportunity != null &&
      item.customerCompanyName?.trim() === normalizedCustomer &&
      item.opportunityName?.trim() === normalizedOpportunity
    )
  })

  if (matched?.id != null) {
    return matched.id
  }

  if (normalizedCustomer && customerMatches.length === 1) {
    return customerMatches[0]?.id ?? null
  }

  return matched?.id ?? null
}

function mapBackendActivityRecord(
  activity: SalesActivityBackendItem,
  company: CompanySummaryResponse | null,
  index: number,
): ActivityRecord {
  const extras = activity.id != null ? getActivityExtraFields(String(activity.id)) : {}
  const date = activity.activityDateTime?.slice(0, 10) || ""
  const activityMode = mapActivityType(activity.activityType)
  const activityPurpose = mapActivityPurpose(activity.activityPurpose)

  return {
    id: String(activity.id ?? index + 1),
    date,
    requestId: activity.salesActivityRequestId != null ? String(activity.salesActivityRequestId) : undefined,
    projectOpportunityId: activity.projectOpportunityId,
    registrant: extras.registrant ?? "",
    requester: extras.requester ?? "",
    customerCode: company?.code ?? String(activity.companyId ?? activity.projectOpportunityId ?? activity.id ?? ""),
    businessCode: activity.projectOpportunityId != null ? String(activity.projectOpportunityId) : "",
    activityMode,
    activityContent: activityPurpose,
    type: activityPurpose,
    customer: activity.companyName ?? company?.name ?? "",
    opportunity: activity.projectOpportunityName ?? "",
    location: activity.location ?? "",
    attendees: activity.attendeeUserIds?.length ? activity.attendeeUserIds.join(", ") : "",
    content: activity.activityContent ?? "",
    issues: activity.customerInterest ?? activity.issue ?? "",
    nextAction: activity.nextActivity ?? "",
    status: mapActivityStatus(activity.status),
    attachments: [],
  }
}

export async function loadBackendActivityRecords() {
  const activities = await fetchSalesActivities()
  const uniqueCompanyIds = Array.from(
    new Set(
      activities
        .map((activity) => activity.companyId)
        .filter((companyId): companyId is number => typeof companyId === "number"),
    ),
  )

  const companyEntries = await Promise.all(
    uniqueCompanyIds.map(async (companyId) => {
      try {
        const company = await fetchCompanySummary(companyId)
        return [companyId, company] as const
      } catch {
        return [companyId, null] as const
      }
    }),
  )

  const companyLookup = new Map<number, CompanySummaryResponse | null>(companyEntries)

  return activities.map((activity, index) => {
    const company = activity.companyId != null ? companyLookup.get(activity.companyId) ?? null : null
    return mapBackendActivityRecord(activity, company, index)
  })
}

async function postSalesActivity(
  method: "POST" | "PATCH",
  payload: SalesActivityCreateRequest | SalesActivityUpdateRequest,
  salesActivityId?: string,
) {
  const response = await fetch(
    `${getBackendApiBaseUrl()}/activity/sales-activities${salesActivityId ? `/${salesActivityId}` : ""}`,
    {
      method,
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  )

  return parseApiResponse<SalesActivityResponse>(response, "영업 활동을 저장하지 못했습니다.")
}

async function mapSavedSalesActivityResponse(saved: SalesActivityResponse & SalesActivityBackendItem) {
  const company = saved.companyId != null ? await fetchCompanySummary(saved.companyId) : null
  return mapBackendActivityRecord(saved, company, 0)
}

export async function loadBackendActivityRecord(salesActivityId: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/sales-activities/${salesActivityId}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  const saved = await parseApiResponse<SalesActivityResponse & SalesActivityBackendItem>(
    response,
    "영업 활동 상세를 불러오지 못했습니다.",
  )
  return mapSavedSalesActivityResponse(saved)
}

async function buildSalesActivityPayload(params: {
  customerName?: string
  opportunityName?: string
  opportunityCode?: string
  projectOpportunityId?: number
  activityMode: string
  activityContent: string
  content: string
  location: string
  activityDate: string
  issues?: string
  nextAction?: string
  status?: string
  attendees?: string
  requestId?: string
  salesActivityRequestId?: number
}) {
  const attendeeUserIds = await resolveAttendeeUserIds(params.attendees)

  return {
    projectOpportunityId: params.projectOpportunityId,
    activityType: mapActivityTypeToEnum(params.activityMode),
    activityPurpose: mapActivityPurposeToEnum(params.activityContent),
    activityContent: params.content,
    location: params.location,
    activityDateTime: `${params.activityDate}T00:00:00`,
    issue: params.issues ?? "",
    nextActivity: params.nextAction ?? "",
    attendeeUserIds,
    customerInterest: params.issues ?? "",
    status: mapActivityStatusToEnum(params.status ?? "완료"),
    salesActivityRequestId: params.salesActivityRequestId,
  } satisfies SalesActivityCreateRequest
}

export async function createBackendActivityRecord(params: {
  customerName?: string
  opportunityName?: string
  opportunityCode?: string
  projectOpportunityId?: number
  registrant?: string
  requester?: string
  activityMode: string
  activityContent: string
  content: string
  location: string
  activityDate: string
  issues?: string
  nextAction?: string
  status?: string
  attendees?: string
  requestId?: string
  salesActivityRequestId?: number
}) {
  const projectOpportunityId = await resolveProjectOpportunityId({
    projectOpportunityId: params.projectOpportunityId,
    customerName: params.customerName,
    opportunityName: params.opportunityName,
    opportunityCode: params.opportunityCode,
  })

  if (projectOpportunityId == null) {
    throw new Error("선택한 고객사에 연결된 사업기회를 찾을 수 없습니다. 먼저 사업기회를 등록한 뒤 활동을 등록해주세요.")
  }

  const payload = await buildSalesActivityPayload({
    ...params,
    projectOpportunityId,
  })

  const saved = await postSalesActivity("POST", payload)
  const mapped = await mapSavedSalesActivityResponse(saved)
  saveActivityExtraFields(mapped.id, {
    registrant: params.registrant,
    requester: params.requester,
  })
  return {
    ...mapped,
    registrant: params.registrant ?? mapped.registrant,
    requester: params.requester ?? mapped.requester,
  }
}

export async function updateBackendActivityRecord(
  salesActivityId: string,
  params: {
    customerName?: string
    opportunityName?: string
    opportunityCode?: string
    projectOpportunityId?: number
    registrant?: string
    requester?: string
    activityMode: string
    activityContent: string
    content: string
    location: string
    activityDate: string
    issues?: string
    nextAction?: string
    status?: string
    attendees?: string
    salesActivityRequestId?: number
  },
) {
  const projectOpportunityId = await resolveProjectOpportunityId({
    projectOpportunityId: params.projectOpportunityId,
    customerName: params.customerName,
    opportunityName: params.opportunityName,
    opportunityCode: params.opportunityCode,
  })

  if (projectOpportunityId == null) {
    throw new Error("선택한 고객사에 연결된 사업기회를 찾을 수 없습니다. 먼저 사업기회를 등록한 뒤 활동을 수정해주세요.")
  }

  const payload = {
    ...(await buildSalesActivityPayload({
      ...params,
      projectOpportunityId,
    })),
    projectOpportunityId,
  } satisfies SalesActivityUpdateRequest & { projectOpportunityId: number }

  const saved = await postSalesActivity("PATCH", payload, salesActivityId)
  const mapped = await mapSavedSalesActivityResponse(saved)
  saveActivityExtraFields(mapped.id, {
    registrant: params.registrant,
    requester: params.requester,
  })
  return {
    ...mapped,
    registrant: params.registrant ?? mapped.registrant,
    requester: params.requester ?? mapped.requester,
  }
}

export async function deleteBackendActivityRecord(salesActivityId: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/sales-activities/${salesActivityId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  })

  await parseVoidApiResponse(response, "영업 활동을 삭제하지 못했습니다.")
  return true
}
