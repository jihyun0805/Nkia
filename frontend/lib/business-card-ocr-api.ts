"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

export type BusinessCardOcrResult = {
  companyName: string | null
  contactName: string | null
  department: string | null
  role: string | null
  position: string | null
  address: string | null
  email: string | null
  mobile: string | null
  phone: string | null
  fax: string | null
  rawText: string | null
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

export async function analyzeBusinessCard(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${getBackendApiBaseUrl()}/business-card-ocr`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData,
  })

  return parseApiResponse<BusinessCardOcrResult>(response, "명함 OCR 처리에 실패했습니다.")
}
