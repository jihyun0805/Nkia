"use client"

import { activityRequests, type ActivityRequestRecord } from "@/lib/activity-data"
import { currentUser } from "@/lib/current-user"

const REQUESTS_STORAGE_KEY = "orbis.activityRequests"
const NOTIFICATIONS_STORAGE_KEY = "orbis.workflowNotifications"
const WORKFLOW_EVENT_NAME = "orbis-workflow-updated"

export type WorkflowNotification = {
  id: string
  title: string
  category: string
  description: string
  href: string
  createdAt: string
  audience?: string
}

export type WorkflowTask = {
  id: string
  title: string
  dueDate: string
  priority: "high" | "medium"
  statusLabel: "승인 필요" | "승인완료" | "접수완료"
  href: string
}

const defaultNotifications: WorkflowNotification[] = [
  {
    id: "notice-1",
    title: "견적서 수정 요청",
    category: "활동",
    description: "LG CNS 견적서에 수정 요청이 등록되었습니다.",
    href: "/activity/quotations/QT-2026-003",
    createdAt: "2026-03-17",
  },
  {
    id: "notice-2",
    title: "PRB 검토 대기",
    category: "입찰",
    description: "국방부 ITSM 도입 건이 본부장 검토 대기 상태입니다.",
    href: "/workflow",
    createdAt: "2026-03-17",
  },
  {
    id: "notice-3",
    title: "유지보수 종료 예정",
    category: "유지보수",
    description: "삼성SDS EMS 유상유지보수 계약이 종료 예정입니다.",
    href: "/maintenance",
    createdAt: "2026-03-17",
  },
]

function isBrowser() {
  return typeof window !== "undefined"
}

function cloneRequests() {
  return activityRequests.map((item) => ({ ...item }))
}

function createCurrentUserApprovalSeed(): ActivityRequestRecord {
  return {
    id: "REQ-2026-099",
    date: "2026-04-24",
    requester: "박과장",
    receiver: currentUser.name,
    type: "제품소개",
    customerCode: "CUS-008",
    customer: "LG CNS",
    opportunityCode: "OPP-2026-008",
    opportunity: "공공 ITSM 고도화",
    content: "고객사 대상 제품소개 지원 요청",
    dueDate: "2026-04-29",
    status: "요청",
    lastAction: "created",
    lastActionAt: "2026-04-24",
  }
}

function getRequestPriority(item: ActivityRequestRecord) {
  if (item.status === "접수완료") return 2
  if (item.lastAction === "updated") return 1
  return 0
}

function normalizeRequests(requests: ActivityRequestRecord[]) {
  const requestMap = new Map<string, ActivityRequestRecord>()

  requests.forEach((item) => {
    const existing = requestMap.get(item.id)

    if (!existing || getRequestPriority(item) >= getRequestPriority(existing)) {
      requestMap.set(item.id, item)
    }
  })

  return Array.from(requestMap.values()).sort((a, b) => b.date.localeCompare(a.date))
}

function ensureCurrentUserApprovalRequest(requests: ActivityRequestRecord[]) {
  const hasSeedRequest = requests.some((item) => item.id === "REQ-2026-099")
  const hasPendingApproval = requests.some(
    (item) => item.receiver === currentUser.name && item.status === "요청",
  )

  if (hasSeedRequest || hasPendingApproval) {
    return requests
  }

  return [createCurrentUserApprovalSeed(), ...requests]
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback

  const stored = window.localStorage.getItem(key)
  if (!stored) return fallback

  try {
    return JSON.parse(stored) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function emitWorkflowUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(WORKFLOW_EVENT_NAME))
}

function nextRequestId(requests: ActivityRequestRecord[]) {
  const max = requests.reduce((acc, item) => {
    const current = Number.parseInt(item.id.split("-").at(-1) ?? "0", 10)
    return Number.isNaN(current) ? acc : Math.max(acc, current)
  }, 0)

  return `REQ-2026-${String(max + 1).padStart(3, "0")}`
}

function createWorkflowNotification(notification: Omit<WorkflowNotification, "id" | "createdAt">): WorkflowNotification {
  return {
    id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: today(),
    ...notification,
  }
}

export function getActivityRequests() {
  const requests = ensureCurrentUserApprovalRequest(
    normalizeRequests(readStorage<ActivityRequestRecord[]>(REQUESTS_STORAGE_KEY, cloneRequests())),
  )

  if (isBrowser()) {
    writeStorage(REQUESTS_STORAGE_KEY, requests)
  }

  return requests
}

export function getWorkflowNotifications(userName: string = currentUser.name) {
  return readStorage<WorkflowNotification[]>(NOTIFICATIONS_STORAGE_KEY, defaultNotifications).filter(
    (item) => !item.audience || item.audience === userName,
  )
}

function saveActivityRequests(requests: ActivityRequestRecord[]) {
  writeStorage(REQUESTS_STORAGE_KEY, requests)
}

function saveWorkflowNotifications(notifications: WorkflowNotification[]) {
  writeStorage(NOTIFICATIONS_STORAGE_KEY, notifications)
}

function pushNotification(notification: Omit<WorkflowNotification, "id" | "createdAt">) {
  const notifications = readStorage<WorkflowNotification[]>(NOTIFICATIONS_STORAGE_KEY, defaultNotifications)
  saveWorkflowNotifications([createWorkflowNotification(notification), ...notifications])
}

export function dismissWorkflowNotification(id: string) {
  const notifications = readStorage<WorkflowNotification[]>(NOTIFICATIONS_STORAGE_KEY, defaultNotifications).filter(
    (item) => item.id !== id,
  )
  saveWorkflowNotifications(notifications)
  emitWorkflowUpdate()
}

export function createActivityRequest(input: Omit<ActivityRequestRecord, "id" | "status" | "approvedAt" | "lastAction" | "lastActionAt">) {
  const requests = getActivityRequests()
  const request: ActivityRequestRecord = {
    ...input,
    id: nextRequestId(requests),
    status: "요청",
    lastAction: "created",
    lastActionAt: today(),
  }

  saveActivityRequests([request, ...requests])
  pushNotification({
    title: "활동 요청 접수 확인 필요",
    category: "활동 요청",
    description: `${request.receiver} 담당자에게 ${request.customer} ${request.type} 요청이 전달되었습니다. 승인(접수) 여부를 확인하세요.`,
    href: `/activity/requests/${request.id}`,
    audience: request.receiver,
  })
  emitWorkflowUpdate()

  return request
}

export function updateActivityRequest(
  id: string,
  input: Omit<ActivityRequestRecord, "id" | "status" | "approvedAt" | "lastAction" | "lastActionAt">,
) {
  const requests = getActivityRequests()
  let updatedRequest: ActivityRequestRecord | null = null

  const updatedRequests = requests.map((item) => {
    if (item.id !== id) return item

    updatedRequest = {
      ...item,
      ...input,
      status: "요청",
      approvedAt: undefined,
      lastAction: "updated",
      lastActionAt: today(),
    }

    return updatedRequest
  })

  if (!updatedRequest) return null

  const updatedRequestRecord = updatedRequest as ActivityRequestRecord

  saveActivityRequests(updatedRequests)
  pushNotification({
    title: "활동 요청 수정본 확인 필요",
    category: "활동 요청",
    description: `${updatedRequestRecord.receiver} 담당자에게 ${updatedRequestRecord.customer} ${updatedRequestRecord.type} 요청이 수정되어 다시 전달되었습니다.`,
    href: `/activity/requests/${updatedRequestRecord.id}`,
    audience: updatedRequestRecord.receiver,
  })
  emitWorkflowUpdate()

  return updatedRequestRecord
}

export function approveActivityRequest(id: string) {
  const requests = getActivityRequests()
  let approvedRequest: ActivityRequestRecord | null = null

  const updatedRequests = requests.map((item) => {
    if (item.id !== id) return item

    approvedRequest = {
      ...item,
      status: "접수완료",
      approvedAt: today(),
      lastAction: "approved",
      lastActionAt: today(),
    }

    return approvedRequest
  })

  if (!approvedRequest) return null

  const approvedRequestRecord = approvedRequest as ActivityRequestRecord

  saveActivityRequests(updatedRequests)
  pushNotification({
    title: "활동 요청 승인 완료",
    category: "활동 요청",
    description: `${approvedRequestRecord.requester} 요청자에게 ${approvedRequestRecord.customer} ${approvedRequestRecord.type} 요청의 접수 완료가 전달되었습니다.`,
    href: `/activity/requests/${approvedRequestRecord.id}`,
    audience: approvedRequestRecord.requester,
  })
  emitWorkflowUpdate()

  return approvedRequestRecord
}

export function getWorkflowTasks(userName: string = currentUser.name) {
  const requestTasks = getActivityRequests().flatMap<WorkflowTask>((item) => {
    if (item.status === "접수완료") {
      if (item.requester === userName) {
        return [
          {
          id: `task-requested-${item.id}`,
          title: `${item.customer} ${item.type} 요청 접수 완료`,
          dueDate: item.approvedAt ?? item.dueDate,
          priority: "medium",
          statusLabel: "접수완료",
          href: `/activity/requests/${item.id}`,
          },
        ]
      }

      return []
    }

    if (item.receiver !== userName) return []

    const prefix = item.lastAction === "updated" ? "수정본 승인 필요" : "승인 필요"

    return [
      {
        id: `task-${item.id}`,
        title: `${prefix} · ${item.customer} ${item.type}`,
        dueDate: item.dueDate,
        priority: "high",
        statusLabel: "승인 필요",
        href: `/activity/requests/${item.id}`,
      },
    ]
  })

  return requestTasks.slice(0, 6)
}

export function subscribeWorkflowUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined

  const listener = () => callback()
  window.addEventListener(WORKFLOW_EVENT_NAME, listener)

  return () => {
    window.removeEventListener(WORKFLOW_EVENT_NAME, listener)
  }
}
