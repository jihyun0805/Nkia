"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { getAccessToken } from "@/lib/auth-session"

export type ManagementReportRequest = {
  query: string
  title?: string
  reportType: "management" | "sales" | "risk" | "project" | "maintenance" | "custom"
  limit: number
  startAt?: string
  endAt?: string
  customerGroup?: string
  businessTypes: string[]
  statuses: string[]
  sourceTypes?: string[]
  sections?: string[]
  audience?: string
  visualization?: {
    includeMetrics: boolean
    includeCharts: boolean
    includeTables: boolean
    chartTypes: string[]
  }
}

export type ReportMetric = {
  label: string
  value: string | number | null
  unit?: string | null
  description?: string | null
}

export type ReportChartPoint = {
  label: string
  value: string | number | null
  extra?: Record<string, unknown>
}

export type ReportChart = {
  type: "bar" | "pie" | string
  title: string
  xKey?: string | null
  yKey?: string | null
  data: ReportChartPoint[]
}

export type ReportTable = {
  title: string
  columns: string[]
  rows: unknown[][]
}

export type ReportEvidence = {
  sourceType: string
  sourceId: string
  title?: string | null
  content?: string | null
  metadata?: Record<string, unknown> | null
  finalScore?: number | null
}

export type ManagementReportResponse = {
  query: string
  title: string
  reportType: string
  reportStatus: string
  report: string
  embeddingModel: string
  chatModel: string
  retrievalConfidence?: number | null
  confidenceBand?: string | null
  confidenceReasons: string[]
  sourceTypes: string[]
  metrics: ReportMetric[]
  charts: ReportChart[]
  tables: ReportTable[]
  evidences: ReportEvidence[]
  degradedReason?: string | null
}

export async function createManagementReport(
  request: ManagementReportRequest,
): Promise<ManagementReportResponse> {
  const token = getAccessToken()
  const response = await fetch(`${getBackendApiBaseUrl()}/reports/management`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.result === "ERROR") {
    throw new Error(payload?.message || "Failed to generate management report")
  }

  return payload.data as ManagementReportResponse
}
