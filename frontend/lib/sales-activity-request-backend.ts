"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { getActivityRequests } from "@/lib/activity-request-workflow"
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

const REQUESTS_STORAGE_KEY = "orbis.activityRequests"
const REQUEST_WORKFLOW_EVENT_NAME = "orbis-workflow-updated"

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

function loadLocalRequestIndex() {
  return new Map(getActivityRequests().map((item) => [item.id, item]))
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

function mergeRequest(
  backendRequest: BackendRequestListItem | BackendRequestResponse,
  local: ActivityRequestRecord | undefined,
): ActivityRequestRecord {
  const activityDate = backendRequest.activityDateTime?.slice(0, 10) || local?.date || today()
  const purposeLabel = activityPurposeLabel(String(backendRequest.activityPurpose ?? local?.type ?? "ETC"))
  const requester =
    backendRequest.requestUserName ??
    local?.requester ??
    "-"
  const receiver =
    backendRequest.targetUserName ?? 
    local?.receiver ?? 
    getTargetUserNameById(backendRequest.targetUserId) ?? 
    "-"
  const content = backendRequest.requestContent ?? local?.content ?? ""
  const title = backendRequest.title ?? local?.title ?? `${purposeLabel} 요청`
  const customerFromBackend = backendRequest.companyName?.trim() ?? ""
  const customerCode = local?.customerCode ?? (backendRequest.companyId != null ? String(backendRequest.companyId) : "")
  const customerFromCode = customerCode ? getCustomerByCode(customerCode)?.name ?? "" : ""
  const localCustomer = local?.customer?.trim() ?? ""
  const customer = customerFromBackend || customerFromCode || (localCustomer && localCustomer !== title.trim() ? localCustomer : "")
  const opportunity = local?.opportunity ?? (content.trim() ? content : "미확인")

  return {
    id: String(backendRequest.id ?? local?.id ?? `REQ-${Date.now()}`),
    backendId: typeof backendRequest.id === "number" ? backendRequest.id : local?.backendId,
    title,
    salesActivityId: backendRequest.salesActivityId != null ? String(backendRequest.salesActivityId) : local?.salesActivityId,
    requestUserId: backendRequest.requestUserId ?? local?.requestUserId,
    requestUserName: backendRequest.requestUserName ?? local?.requestUserName,
    targetUserId: backendRequest.targetUserId ?? local?.targetUserId,
    targetUserName: backendRequest.targetUserName ?? local?.targetUserName,
    date: local?.date ?? activityDate,
    requester,
    receiver,
    type: local?.type ?? purposeLabel,
    customerCode,
    customer,
    opportunityCode: local?.opportunityCode ?? "",
    opportunity,
    content,
    dueDate: local?.dueDate ?? activityDate,
    status: backendRequest.status ?? local?.status ?? "요청",
    approvedAt: local?.approvedAt,
    lastAction: local?.lastAction,
    lastActionAt: local?.lastActionAt,
    attachments: local?.attachments ?? [],
  }
}

function saveMergedRequests(requests: ActivityRequestRecord[]) {
  if (!isBrowser()) return

  const next = JSON.stringify(requests)
  if (window.localStorage.getItem(REQUESTS_STORAGE_KEY) === next) return

  window.localStorage.setItem(REQUESTS_STORAGE_KEY, next)
  window.dispatchEvent(new Event(REQUEST_WORKFLOW_EVENT_NAME))
}

function upsertMergedRequest(request: ActivityRequestRecord, requests: ActivityRequestRecord[]) {
  return [request, ...requests.filter((item) => item.id !== request.id)]
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
  const localIndex = loadLocalRequestIndex()
  const detail = await fetchRequestDetail(id)
  return mergeRequest(detail, localIndex.get(String(id)))
}

export async function loadBackendActivityRequests() {
  const localIndex = loadLocalRequestIndex()
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

  const merged = details
      .filter((item): item is BackendRequestResponse => Boolean(item && item.id != null))
    .map((item) => mergeRequest(item, localIndex.get(String(item.id))))
    .sort((a, b) => b.date.localeCompare(a.date))

  const localOnly = Array.from(localIndex.values()).filter(
    (item) => !merged.some((backendItem) => backendItem.id === item.id),
  )

  const combined = [...merged, ...localOnly].sort((a, b) => b.date.localeCompare(a.date))
  saveMergedRequests(combined)
  return combined
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
  const localIndex = loadLocalRequestIndex()
  const fallbackTitle = title
  const merged: ActivityRequestRecord = {
    id: String(saved.id ?? `${Date.now()}`),
    title: saved.title ?? fallbackTitle,
    salesActivityId: saved.salesActivityId != null ? String(saved.salesActivityId) : undefined,
    requestUserId: saved.requestUserId ?? undefined,
    requestUserName: saved.requestUserName ?? input.requester,
    targetUserId,
    targetUserName: saved.targetUserName ?? input.receiver,
    date: input.date || saved.activityDateTime?.slice(0, 10) || today(),
    requester: input.requester,
    receiver: input.receiver,
    type: input.type,
    customerCode: saved.companyId != null ? String(saved.companyId) : input.customerCode,
    customer: saved.companyName ?? getCustomerByCode(String(saved.companyId ?? input.customerCode))?.name ?? input.customer,
    opportunityCode: input.opportunityCode,
    opportunity: input.opportunity,
    content: input.content,
    dueDate: input.dueDate || saved.activityDateTime?.slice(0, 10) || input.date,
    status: "요청",
    lastAction: "created",
    lastActionAt: today(),
    attachments: input.attachments ?? [],
  }

  saveMergedRequests(
    upsertMergedRequest(
      merged,
      Array.from(localIndex.values()).filter((item) => item.id !== merged.id),
    ),
  )
  return merged
}
