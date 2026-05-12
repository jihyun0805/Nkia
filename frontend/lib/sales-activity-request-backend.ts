"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { getActivityRequests } from "@/lib/activity-request-workflow"
import { type ActivityAttachment, type ActivityRequestRecord } from "@/lib/activity-data"
import { getPresalesUsers } from "@/lib/admin-data"
import type {
  SalesActivityRequestCreateRequest,
  SalesActivityRequestResponse,
  SalesActivityRequestResponseActivityPurpose,
} from "@/lib/api/generated/model"

type BackendRequestListItem = {
  id?: number
  salesActivityId?: number
  targetUserId?: string
  activityPurpose?: SalesActivityRequestResponseActivityPurpose | string
  activityDateTime?: string
  requestContent?: string
}

type RequestCreateInput = {
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

function loadLocalRequestIndex() {
  return new Map(getActivityRequests().map((item) => [item.id, item]))
}

function getTargetUserIdByName(name: string) {
  return getPresalesUsers().find((user) => user.name === name)?.id
}

function getTargetUserNameById(id?: string) {
  if (!id) return undefined
  return getPresalesUsers().find((user) => user.id === id)?.name
}

function mergeRequest(
  backendRequest: BackendRequestListItem | SalesActivityRequestResponse,
  local: ActivityRequestRecord | undefined,
): ActivityRequestRecord {
  const activityDate = backendRequest.activityDateTime?.slice(0, 10) || local?.date || today()
  const purposeLabel = activityPurposeLabel(String(backendRequest.activityPurpose ?? local?.type ?? "ETC"))
  const requester = local?.requester ?? "-"
  const receiver = local?.receiver ?? getTargetUserNameById(backendRequest.targetUserId) ?? "-"
  const content = backendRequest.requestContent ?? local?.content ?? ""

  return {
    id: String(backendRequest.id ?? local?.id ?? `REQ-${Date.now()}`),
    date: local?.date ?? activityDate,
    requester,
    receiver,
    type: local?.type ?? purposeLabel,
    customerCode: local?.customerCode ?? "",
    customer: local?.customer ?? `${purposeLabel} 요청`,
    opportunityCode: local?.opportunityCode ?? "",
    opportunity: local?.opportunity ?? "미확인",
    content,
    dueDate: local?.dueDate ?? activityDate,
    status: local?.status ?? "요청",
    approvedAt: local?.approvedAt,
    lastAction: local?.lastAction,
    lastActionAt: local?.lastActionAt,
    attachments: local?.attachments ?? [],
  }
}

function saveMergedRequests(requests: ActivityRequestRecord[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests))
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

  return parseApiResponse<SalesActivityRequestResponse>(response, "활동 요청 상세를 불러오지 못했습니다.")
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
      .filter((item): item is SalesActivityRequestResponse => Boolean(item && item.id != null))
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
  const targetUserId = getTargetUserIdByName(input.receiver)
  if (!targetUserId) {
    throw new Error("담당자를 백엔드 사용자에서 찾을 수 없습니다.")
  }

  const payload: SalesActivityRequestCreateRequest = {
    targetUserId,
    activityPurpose: activityPurposeEnum(input.type),
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

  const saved = await parseApiResponse<SalesActivityRequestResponse>(response, "활동 요청을 저장하지 못했습니다.")
  const localIndex = loadLocalRequestIndex()
  const merged: ActivityRequestRecord = {
    id: String(saved.id ?? `${Date.now()}`),
    date: input.date || saved.activityDateTime?.slice(0, 10) || today(),
    requester: input.requester,
    receiver: input.receiver,
    type: input.type,
    customerCode: input.customerCode,
    customer: input.customer,
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
