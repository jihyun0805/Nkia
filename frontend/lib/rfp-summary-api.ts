"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

export type RfpSummaryResult = {
  fileName: string
  extension: string
  fileType: string
  extractedTextChars: number
  extractedText: string
  summary: string
}

const RFP_DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "ppt", "pptx", "hwp", "hwpx", "txt", "md"])
export const RFP_DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.hwp,.hwpx,.txt,.md"

export function assertRfpDocumentFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!RFP_DOCUMENT_EXTENSIONS.has(extension)) {
    throw new Error("지원 형식: pdf, doc, docx, ppt, pptx, hwp, hwpx, txt, md")
  }
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

export async function summarizeRfpDocument(file: File) {
  assertRfpDocumentFile(file)

  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${getBackendApiBaseUrl()}/rfp-summary`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData,
  })

  return parseApiResponse<RfpSummaryResult>(response, "RFP AI 요약 생성에 실패했습니다.")
}
