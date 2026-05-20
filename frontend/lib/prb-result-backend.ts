"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"
import { currentUser } from "@/lib/current-user"
import { getPrbResults, getPrbs, replacePrbResults, type PrbRecord, type PrbResultRecord } from "@/lib/bid-data"
import { loadBackendPrbs } from "@/lib/prb-backend"

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

type BackendPrbResultAttendeeOpinion = {
  attendeeUserId?: string
  attendeeUserName?: string
  opinion?: string
  approvalStatus?: string
}

type BackendPrbResultSummary = {
  id?: number
  customerCompanyName?: string
  opportunityName?: string
  proposalDeadlineDatetime?: string
  createdByUserName?: string
  createdAt?: string
}

type BackendPrbResultResponse = BackendPrbResultSummary & {
  prbId?: number
  riskFactors?: string
  comprehensiveOpinion?: string
  meetingLocation?: string
  meetingDateTime?: string
  attendeeOpinions?: BackendPrbResultAttendeeOpinion[]
}

export type BackendPrbResultHistoryListItem = {
  historyId?: number
  prbResultId?: number
  version?: number
  createdAt?: string
}

type BackendPrbResultHistoryResponse = BackendPrbResultResponse & {
  historyId?: number
  prbResultId?: number
  version?: number
  status?: string
  createdByName?: string
}

type BackendPrbResultAttendeeOpinionRequest = {
  attendeeUserId: string
  opinion?: string | null
  approvalStatus: "PENDING" | "REJECTED" | "APPROVED" | "CONDITIONAL"
}

type BackendPrbResultCreateRequest = {
  prbId: number
  riskFactors?: string | null
  comprehensiveOpinion?: string | null
  meetingLocation?: string | null
  meetingDateTime?: string | null
  attendeeOpinions?: BackendPrbResultAttendeeOpinionRequest[]
}

type BackendPrbResultUpdateRequest = Omit<BackendPrbResultCreateRequest, "prbId">

const PRB_RESULT_LIST_SIZE = 2000

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

function formatDate(value?: string) {
  if (!value) return ""
  return value.slice(0, 10)
}

function parseNumber(value?: string | number | null) {
  if (typeof value === "number") return value
  if (!value) return null
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ""))
  return Number.isNaN(parsed) ? null : parsed
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

async function fetchPrbResultList() {
  const response = await fetch(`${getBackendApiBaseUrl()}/prb-results?size=${PRB_RESULT_LIST_SIZE}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  const payload = await parseApiResponse<BackendPage<BackendPrbResultSummary>>(
    response,
    "PRB 결과 목록을 불러오지 못했습니다.",
  )
  return payload.content ?? []
}

async function fetchPrbResultDetail(id: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/prb-results/${id}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendPrbResultResponse>(response, "PRB 결과 상세를 불러오지 못했습니다.")
}

async function fetchPrbResultHistoryList(id: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/prb-results/${id}/histories`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendPrbResultHistoryListItem[]>(response, "PRB 결과 변경 이력을 불러오지 못했습니다.")
}

async function fetchPrbResultHistoryDetail(historyId: number) {
  const response = await fetch(`${getBackendApiBaseUrl()}/prb-results/histories/${historyId}`, {
    headers: buildAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  })

  return parseApiResponse<BackendPrbResultHistoryResponse>(response, "PRB 결과 변경 이력 상세를 불러오지 못했습니다.")
}

function mapApprovalStatusToBackend(value?: string) {
  if (value === "찬성") return "APPROVED" as const
  if (value === "반대") return "REJECTED" as const
  if (value === "조건부") return "CONDITIONAL" as const
  return "PENDING" as const
}

function mapApprovalStatusToDisplay(value?: string) {
  if (value === "APPROVED") return "찬성"
  if (value === "REJECTED") return "반대"
  if (value === "CONDITIONAL") return "조건부"
  return "미정"
}

function normalizeAttendeeOpinions(
  opinions?: PrbResultRecord["attendeeOpinions"],
  prb?: PrbRecord | null,
) {
  const source = Array.isArray(opinions) ? opinions.slice(0, 7) : []
  const normalized = source.map((item) => ({
    participant: item?.participant ?? "",
    opinion: item?.opinion ?? "",
    decision: item?.decision ?? "",
  }))

  while (normalized.length < 7) {
    const index = normalized.length
    normalized.push({
      participant: prb?.approvalLines?.[index]?.name ?? `참석자 ${index + 1}`,
      opinion: "",
      decision: "",
    })
  }

  return normalized
}

function resolveAttendeeUserId(participant?: string | null, currentUserId?: string) {
  const normalized = normalizeLookupText(participant)
  if (!normalized) return ""

  if (/^[0-9a-f-]{36}$/i.test(normalized)) {
    return participant?.trim() ?? ""
  }

  const currentNormalizedName = normalizeLookupText(currentUser.name)
  const currentNormalizedEmail = normalizeLookupText(currentUser.email)
  const currentNormalizedId = normalizeLookupText(currentUserId ?? currentUser.id)

  if (
    normalized === currentNormalizedName ||
    normalized === currentNormalizedEmail ||
    normalized === currentNormalizedId
  ) {
    return currentUserId ?? currentUser.id
  }

  return ""
}

function mapBackendPrbResult(
  item: BackendPrbResultResponse,
  summary: BackendPrbResultSummary,
  local?: PrbResultRecord | null,
): PrbResultRecord {
  const prb = item.prbId != null ? getPrbs().find((record) => record.id === String(item.prbId)) ?? null : null
  const fallbackCustomer = local?.customer ?? summary.customerCompanyName ?? ""
  const fallbackOpportunity = local?.opportunity ?? summary.opportunityName ?? ""
  const fallbackDeadline = local?.proposalDeadline ?? formatDate(summary.proposalDeadlineDatetime) ?? ""
  const fallbackCreatedAt = local?.createdAt ?? summary.createdAt ?? new Date().toISOString()
  const attendeeOpinions = normalizeAttendeeOpinions(
    item.attendeeOpinions?.map((opinion) => ({
      participant: opinion.attendeeUserName ?? opinion.attendeeUserId ?? "",
      opinion: opinion.opinion ?? "",
      decision: mapApprovalStatusToDisplay(opinion.approvalStatus),
    })),
    prb,
  )

  return {
    id: String(item.id ?? local?.id ?? `PRBR-${Date.now()}`),
    prbId: String(item.prbId ?? local?.prbId ?? ""),
    customerCode: prb?.customerCode ?? local?.customerCode ?? "",
    customer: fallbackCustomer,
    opportunityCode: prb?.opportunityCode ?? local?.opportunityCode ?? "",
    opportunity: fallbackOpportunity,
    proposalDeadline: fallbackDeadline,
    createdDate: formatDate(item.createdAt) || local?.createdDate || formatDate(summary.createdAt) || "",
    author: item.createdByUserName ?? summary.createdByUserName ?? local?.author ?? currentUser.name,
    meetingDate: formatDate(item.meetingDateTime) || local?.meetingDate || "",
    location: item.meetingLocation ?? local?.location ?? "",
    riskFactors: item.riskFactors ?? local?.riskFactors ?? "",
    attendeeOpinions,
    overallOpinion: item.comprehensiveOpinion ?? local?.overallOpinion ?? "",
    createdAt: fallbackCreatedAt,
    updatedAt: item.createdAt ?? local?.updatedAt ?? fallbackCreatedAt,
  }
}

function buildAttendeeOpinionRequests(
  opinions: PrbResultRecord["attendeeOpinions"],
  currentUserId?: string,
) {
  const requests: BackendPrbResultAttendeeOpinionRequest[] = []

  for (const item of opinions ?? []) {
    const participant = item.participant.trim()
    const opinion = item.opinion.trim()
    const decision = item.decision.trim()

    if (!participant && !opinion && !decision) {
      continue
    }

    if (/^참석자\s*\d+$/u.test(participant) && !opinion && !decision) {
      continue
    }

    const attendeeUserId = resolveAttendeeUserId(participant, currentUserId)
    if (!attendeeUserId) {
      continue
    }

    requests.push({
      attendeeUserId,
      opinion: opinion || null,
      approvalStatus: mapApprovalStatusToBackend(decision),
    })
  }

  return requests
}

async function buildPrbResultRequest(input: Omit<PrbResultRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const prbId = parseNumber(input.prbId)
  if (prbId == null) {
    throw new Error("PRB 결과를 저장할 PRB를 찾지 못했습니다.")
  }

  const currentUserId = await fetchCurrentUserId()
  const attendeeOpinions = buildAttendeeOpinionRequests(input.attendeeOpinions, currentUserId)

  return {
    prbId,
    request: {
      riskFactors: input.riskFactors || null,
      comprehensiveOpinion: input.overallOpinion || null,
      meetingLocation: input.location || null,
      meetingDateTime: input.meetingDate ? `${input.meetingDate}T00:00:00` : null,
      attendeeOpinions,
    } satisfies BackendPrbResultCreateRequest | BackendPrbResultUpdateRequest,
  }
}

async function loadResultSnapshot() {
  const prbResults = await fetchPrbResultList()
  await loadBackendPrbs()
  const prbLookup = new Map(getPrbs().map((item) => [item.id, item] as const))
  const localLookup = new Map(getPrbResults().map((item) => [item.id, item] as const))

  const records = await Promise.all(
    prbResults.map(async (summary) => {
      if (summary.id == null) return null

      try {
        const detail = await fetchPrbResultDetail(String(summary.id))
        return mapBackendPrbResult(detail, summary, localLookup.get(String(summary.id)) ?? null)
      } catch {
        return null
      }
    }),
  )

  const normalized = records.filter((item): item is PrbResultRecord => Boolean(item))
  const merged = normalized.map((item) => {
    const prb = item.prbId ? prbLookup.get(item.prbId) ?? null : null
    return {
      ...item,
      customerCode: prb?.customerCode ?? item.customerCode,
      customer: prb?.customer ?? item.customer,
      opportunityCode: prb?.opportunityCode ?? item.opportunityCode,
      opportunity: prb?.opportunity ?? item.opportunity,
      proposalDeadline: prb?.proposalDeadline ?? item.proposalDeadline,
    }
  })

  replacePrbResults(merged)
  return merged
}

export async function loadBackendPrbResults() {
  return loadResultSnapshot()
}

export async function loadBackendPrbResultHistoryRecords(prbResultId: string) {
  return fetchPrbResultHistoryList(prbResultId)
}

export async function loadBackendPrbResultHistoryRecord(historyId: number) {
  await loadBackendPrbs()
  const detail = await fetchPrbResultHistoryDetail(historyId)
  const resultId = detail.prbResultId ?? detail.id
  const summary: BackendPrbResultSummary = {
    id: resultId,
    createdByUserName: detail.createdByName,
    createdAt: detail.createdAt,
  }
  return mapBackendPrbResult({ ...detail, id: resultId } as BackendPrbResultResponse, summary, null)
}

export async function saveBackendPrbResult(input: Omit<PrbResultRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  await loadBackendPrbs()
  const local = input.id ? getPrbResults().find((item) => item.id === input.id) ?? null : null
  const payload = await buildPrbResultRequest(input)
  const hasNumericId = Boolean(input.id && Number.isFinite(Number(input.id)))
  const response = await fetch(
    hasNumericId ? `${getBackendApiBaseUrl()}/prb-results/${input.id}` : `${getBackendApiBaseUrl()}/prb-results`,
    {
      method: hasNumericId ? "PUT" : "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload.request),
    },
  )

  const saved = await parseApiResponse<BackendPrbResultResponse>(response, "PRB 결과 저장에 실패했습니다.")
  const summary: BackendPrbResultSummary = {
    id: saved.id ?? Number(input.id ?? 0),
    customerCompanyName: input.customer ?? local?.customer ?? "",
    opportunityName: input.opportunity ?? local?.opportunity ?? "",
    proposalDeadlineDatetime: input.proposalDeadline
      ? `${input.proposalDeadline}T00:00:00`
      : local?.proposalDeadline
        ? `${local.proposalDeadline}T00:00:00`
        : undefined,
    createdByUserName: saved.createdByUserName ?? currentUser.name,
    createdAt: saved.createdAt ?? local?.createdAt ?? input.createdDate,
  }
  const merged = mapBackendPrbResult(saved, summary, local ?? undefined)
  const next = [merged, ...getPrbResults().filter((item) => item.id !== merged.id && item.id !== input.id)]
  replacePrbResults(next)
  return merged
}

export async function deleteBackendPrbResult(id: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/prb-results/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
    credentials: "include",
  })

  await parseApiResponse<Record<string, unknown>>(response, "PRB 결과 삭제에 실패했습니다.")
  replacePrbResults(getPrbResults().filter((item) => item.id !== id))
  return true
}
