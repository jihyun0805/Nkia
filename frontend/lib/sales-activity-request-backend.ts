"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { type ActivityAttachment, type ActivityRequestRecord } from "@/lib/activity-data"
import { getCustomerByCode } from "@/lib/finding-data"
import { getPresalesUsers } from "@/lib/admin-data"
import { loadBackendUsers } from "@/lib/workflow-backend"
import type {
  SalesActivityRequestCreateRequest,
  SalesActivityRequestResponse,
  SalesActivityRequestResponseActivityPurpose,
} from "@/lib/api/generated/model"
import { SalesActivityCreateRequestActivityType } from "@/lib/api/generated/model/salesActivityCreateRequestActivityType"

type BackendRequestResponse = SalesActivityRequestResponse & {
  backendId?: number
  title?: string
  companyId?: number
  companyName?: string
  requestUserId?: string
  requestUserName?: string
  targetUserName?: string
  status?: string
}

type BackendRequestListItem = {
  id?: number
  title?: string
  companyId?: number
  companyName?: string
  salesActivityId?: number
  requestUserId?: string
  requestUserName?: string
  targetUserId?: string
  targetUserName?: string
  activityPurpose?: SalesActivityRequestResponseActivityPurpose | string
  activityDateTime?: string
  requestContent?: string
  status?: string
}

type RequestCreateInput = {
  title: string
  companyId: number
  customerCode: string
  customer: string
  opportunityCode: string
  opportunity: string
  type: string
  requester: string
  receiver: string
  date: string
  dueDate: string
  content: string
  attachments?: ActivityAttachment[]
}

type BackendSalesActivityRequestCreatePayload = SalesActivityRequestCreateRequest & {
  title: string
  companyId: number
  activityType: typeof SalesActivityCreateRequestActivityType.EMAIL
}

// 활동요청 탭의 로컬 캐시 키. 요청/활동/견적 사이의 연결 상태를 저장한다.
const REQUESTS_STORAGE_KEY = "orbis.activityRequests"
const REQUEST_WORKFLOW_EVENT_NAME = "orbis-workflow-updated"

// 백엔드 activityPurpose enum -> 화면 라벨
const ACTIVITY_PURPOSE_TO_LABEL: Record<string, string> = {
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

// 화면 라벨 -> 백엔드 activityPurpose enum
const ACTIVITY_PURPOSE_TO_ENUM: Record<string, SalesActivityRequestCreateRequest["activityPurpose"]> = {
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

function isBrowser() {
  return typeof window !== "undefined"
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { result?: string; data?: T | null; message?: string | null } | null

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage)
  }

  if (payload?.result !== "SUCCESS" || payload.data == null) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload.data
}

function activityPurposeLabel(value?: string) {
  if (!value) return "기타"
  return ACTIVITY_PURPOSE_TO_LABEL[value] ?? value
}

function activityPurposeEnum(value: string) {
  return ACTIVITY_PURPOSE_TO_ENUM[value] ?? "ETC"
}

function normalizeLookupText(value: string) {
  return value.trim().toLowerCase()
}

async function getTargetUserIdByName(name: string) {
  const normalized = normalizeLookupText(name)
  if (!normalized) return null

  let backendUsers: { id?: string; employeeNumber?: string; name?: string }[] = []
  try {
    backendUsers = await loadBackendUsers()
  } catch {
    backendUsers = []
  }

  const presalesUsers = getPresalesUsers().map((user) => ({
    id: user.id,
    employeeNumber: user.employeeNumber,
    name: user.name,
  }))

  const matched = [...backendUsers, ...presalesUsers].find((user) => {
    const userId = normalizeLookupText(user.id ?? "")
    const employeeNumber = normalizeLookupText(user.employeeNumber ?? "")
    const userName = normalizeLookupText(user.name ?? "")

    return userId === normalized || employeeNumber === normalized || userName === normalized
  })

  return matched?.id ?? null
}

function getTargetUserNameById(id?: string) {
  if (!id) return undefined
  return getPresalesUsers().find((user) => user.id === id)?.name
}

// 활동이 연결되면 접수완료, 아직 요청만 있으면 요청 상태로 보여준다.
function mapRequestStatus(salesActivityId?: number) {
  return salesActivityId != null ? "접수완료" : "요청"
}

function mergeRequest(
  backendRequest: BackendRequestListItem | BackendRequestResponse,
): ActivityRequestRecord {
  const activityDate = backendRequest.activityDateTime?.slice(0, 10) || today()
  const purposeLabel = activityPurposeLabel(String(backendRequest.activityPurpose ?? "ETC"))
  const requester = backendRequest.requestUserName ?? "-"
  const receiver = backendRequest.targetUserName ?? getTargetUserNameById(backendRequest.targetUserId) ?? "-"
  const content = backendRequest.requestContent ?? ""
  const title = backendRequest.title ?? `${purposeLabel} 요청`
  const customerFromBackend = backendRequest.companyName?.trim() ?? ""
  const customerCode = backendRequest.companyId != null ? String(backendRequest.companyId) : ""
  const customerFromCode = customerCode ? getCustomerByCode(customerCode)?.name ?? "" : ""
  const customer = customerFromBackend || customerFromCode
  const opportunity = ""

  return {
    id: String(backendRequest.id ?? `${Date.now()}`),
    backendId: typeof backendRequest.id === "number" ? backendRequest.id : undefined,
    title,
    salesActivityId: backendRequest.salesActivityId != null ? String(backendRequest.salesActivityId) : undefined,
    requestUserId: backendRequest.requestUserId ?? undefined,
    requestUserName: backendRequest.requestUserName ?? undefined,
    targetUserId: backendRequest.targetUserId ?? undefined,
    targetUserName: backendRequest.targetUserName ?? undefined,
    date: activityDate,
    requester,
    receiver,
    type: purposeLabel,
    customerCode,
    customer,
    opportunityCode: "",
    opportunity,
    content,
    dueDate: activityDate,
    status: mapRequestStatus(backendRequest.salesActivityId),
    approvedAt: undefined,
    lastAction: undefined,
    lastActionAt: undefined,
    attachments: [],
  }
}

async function fetchRequestList() {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/sales-activity-requests`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendRequestListItem[]>(response, "활동 요청 목록을 불러오지 못했습니다.")
}

async function fetchRequestDetail(id: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/activity/sales-activity-requests/${id}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendRequestResponse>(response, "활동 요청 상세를 불러오지 못했습니다.")
}

export async function loadBackendActivityRequest(id: number) {
  const detail = await fetchRequestDetail(id)
  return mergeRequest(detail)
}

export async function loadBackendActivityRequests() {
  const backendRequests = await fetchRequestList()

  const details = await Promise.all(
    backendRequests
      .map((item) => item.id)
      .filter((id): id is number => typeof id === "number")
      .map(async (id) => {
        try {
          return await fetchRequestDetail(id)
        } catch {
          return null
        }
      }),
  )

  return details
    .filter((item): item is BackendRequestResponse => Boolean(item && item.id != null))
    .map((item) => mergeRequest(item))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function createBackendActivityRequest(input: RequestCreateInput) {
  const targetUserId = await getTargetUserIdByName(input.receiver)
  if (!targetUserId) {
    throw new Error("입력한 담당자명을 백엔드 사용자에서 찾을 수 없습니다.")
  }

  const title = input.title.trim() || `${input.customer} ${input.type}`.trim() || `${input.type} 요청`
  const payload: BackendSalesActivityRequestCreatePayload = {
    title,
    companyId: input.companyId,
    targetUserId,
    activityPurpose: activityPurposeEnum(input.type),
    activityType: SalesActivityCreateRequestActivityType.EMAIL,
    activityDateTime: `${input.dueDate || input.date}T00:00:00`,
    requestContent: input.content,
  }

  const response = await fetch(`${getBackendApiBaseUrl()}/activity/sales-activity-requests`, {
    method: "POST",
    headers: {
      ...buildAuthHeaders(),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  const saved = await parseApiResponse<BackendRequestResponse>(response, "활동 요청을 저장하지 못했습니다.")
  const fallbackTitle = title
  return {
    id: String(saved.id ?? `${Date.now()}`),
    title: saved.title ?? fallbackTitle,
    salesActivityId: saved.salesActivityId != null ? String(saved.salesActivityId) : undefined,
    requestUserId: saved.requestUserId ?? undefined,
    requestUserName: saved.requestUserName ?? input.requester,
    targetUserId,
    targetUserName: saved.targetUserName ?? input.receiver,
    date: saved.activityDateTime?.slice(0, 10) || input.date || today(),
    requester: saved.requestUserName ?? input.requester,
    receiver: saved.targetUserName ?? input.receiver,
    type: activityPurposeLabel(String(saved.activityPurpose ?? activityPurposeEnum(input.type))),
    customerCode: saved.companyId != null ? String(saved.companyId) : input.customerCode,
    customer: saved.companyName ?? getCustomerByCode(String(saved.companyId ?? input.customerCode))?.name ?? input.customer,
    opportunityCode: input.opportunityCode,
    opportunity: "",
    content: saved.requestContent ?? input.content,
    dueDate: saved.activityDateTime?.slice(0, 10) || input.dueDate || input.date,
    status: mapRequestStatus(saved.salesActivityId),
    approvedAt: undefined,
    lastAction: undefined,
    lastActionAt: undefined,
    attachments: input.attachments ?? [],
  }
}
