"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type BackendMyInfoResponse = {
  userId?: string
  name?: string
  email?: string
  roles?: string[]
  permissions?: string[]
}

export type BackendUserSummary = {
  id?: string
  employeeNumber?: string
  position?: "TEAM_MEMBER" | "TEAM_LEADER" | "HEAD_DIRECTOR"
  name?: string
  phone?: string
  email?: string
}

type WorkflowApproveInput = {
  nextApproverId?: string | null
  comment?: string
}

type WorkflowRejectInput = {
  comment?: string
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

export async function loadBackendCurrentUserInfo() {
  const response = await fetch(`${getBackendApiBaseUrl()}/user/me`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendMyInfoResponse>(response, "현재 사용자 정보를 불러오지 못했습니다.")
}

export async function loadBackendUsers() {
  const response = await fetch(`${getBackendApiBaseUrl()}/user`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendUserSummary[]>(response, "사용자 목록을 불러오지 못했습니다.")
}

export function resolveWorkflowApproverId(assignee: string, users: BackendUserSummary[]) {
  const normalized = assignee.trim()
  if (!normalized) return null

  const matchedByName = users.find((user) => user.name?.trim() === normalized || user.employeeNumber?.trim() === normalized)
  if (matchedByName?.id) return matchedByName.id

  const normalizedPosition = normalized === "팀장" ? "TEAM_LEADER" : normalized === "본부장" ? "HEAD_DIRECTOR" : normalized === "담당자" ? "TEAM_MEMBER" : null
  if (!normalizedPosition) return null

  return users.find((user) => user.position === normalizedPosition)?.id ?? null
}

export async function approveBackendWorkflow(workflowId: number, input: WorkflowApproveInput = {}) {
  const response = await fetch(`${getBackendApiBaseUrl()}/admin/workflows/${workflowId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      nextApproverId: input.nextApproverId ?? null,
      comment: input.comment ?? "",
    }),
  })

  await parseApiResponse<string>(response, "워크플로우 승인을 처리하지 못했습니다.")
  return true
}

export async function rejectBackendWorkflow(workflowId: number, input: WorkflowRejectInput = {}) {
  const response = await fetch(`${getBackendApiBaseUrl()}/admin/workflows/${workflowId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      comment: input.comment ?? "",
    }),
  })

  await parseApiResponse<string>(response, "워크플로우 반려를 처리하지 못했습니다.")
  return true
}
