"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"

export type EntitySuggestionTarget = "all" | "customers" | "partners" | "opportunities"

export type EntitySuggestion = {
  type: "CUSTOMER" | "PARTNER" | "PROJECT_OPPORTUNITY"
  id: string
  code?: string | null
  label: string
  subtitle?: string | null
  score: number
  matchedBy: "prefix" | "contains" | "fuzzy" | "code"
  metadata: Record<string, unknown>
}

type ApiResponse<T> = {
  result?: string
  data?: T | null
  message?: string | null
}

type EntitySuggestionsPayload = {
  query: string
  target: EntitySuggestionTarget
  results: EntitySuggestion[]
}

export async function getEntitySuggestions(params: {
  query: string
  target: EntitySuggestionTarget
  limit?: number
  signal?: AbortSignal
}) {
  const query = params.query.trim()
  if (!query) return []

  const searchParams = new URLSearchParams({
    q: query,
    target: params.target,
    limit: String(params.limit ?? 8),
  })

  const response = await fetch(`${getBackendApiBaseUrl()}/search/suggestions?${searchParams.toString()}`, {
    method: "GET",
    headers: buildAuthHeaders(),
    signal: params.signal,
  })

  if (!response.ok) {
    throw new Error("추천 검색에 실패했습니다.")
  }

  const payload = (await response.json()) as ApiResponse<EntitySuggestionsPayload>
  if (payload.result !== "SUCCESS" || !payload.data) {
    throw new Error(payload.message || "추천 검색에 실패했습니다.")
  }

  return payload.data.results ?? []
}
