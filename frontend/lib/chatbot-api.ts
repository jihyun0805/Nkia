"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

type ConversationHistoryMessage = {
  role: "user" | "assistant"
  content: string
}

export type ChatbotDraftPayload = {
  document_type: string
  summary?: string | null
  slots?: Record<string, unknown>
  slot_details?: Array<Record<string, unknown>>
  references?: string[]
  notes?: string[]
}

export type ChatbotDraftAction = {
  type: "create_draft"
  label: string
  button_label: string
  document_type: string
  payload: ChatbotDraftPayload
  evidence_ids?: string[]
  confidence?: number
  reasons?: string[]
}

export type ChatbotAnswerRequest = {
  query: string
  history: ConversationHistoryMessage[]
  limit: number
  threadId: string | null
  attachmentSessionId: string | null
  startAt: string | null
  endAt: string | null
}

export type ChatbotEvidence = {
  evidenceType?: string
  sourceType: string
  sourceId: string
  title: string | null
  chunkIndex: number
  distance: number
  vectorScore?: number
  keywordScore?: number
  finalScore?: number
  matchedBy?: string[]
  content: string
  metadata: Record<string, unknown>
}

export type ChatbotTypedEvidences = {
  retrievedEvidence: ChatbotEvidence[]
  structuredEvidence: ChatbotEvidence[]
  derivedSummaryEvidence: ChatbotEvidence[]
}

export type ChatbotAnswerPayload = {
  query: string
  answer: string
  threadId?: string | null
  route?: string
  answerStatus?: string
  embeddingModel?: string
  chatModel?: string
  retrievalConfidence?: number | null
  confidenceBand?: "high" | "medium" | "low" | null
  confidenceReasons?: string[]
  appliedDefaults?: string[]
  missingRequiredSlots?: string[]
  degradedReason?: string | null
  excludedSourceTypes?: string[]
  evidences: ChatbotEvidence[]
  typedEvidences?: ChatbotTypedEvidences
  actions?: ChatbotDraftAction[]
}

export type UploadedChatbotAttachment = {
  fileId: string
  fileName: string
  extension: string
  fileType: string
  size: number
  indexedStatus: string
  sourceId: string | null
  preview: string
}

export type ChatSessionPayload = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type ChatMessagePayload = {
  id: string
  sessionId: string
  role: "user" | "assistant"
  content: string
  threadId?: string | null
  route?: string | null
  answerStatus?: string | null
  evidences?: string | null
  typedEvidences?: string | null
  actions?: string | null
  createdAt: string
}

async function extractErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as
      | ApiResponse<unknown>
      | { detail?: string; message?: string; error?: string }

    if ("detail" in data && data.detail) return data.detail
    if ("message" in data && data.message) return data.message
    if ("error" in data && data.error) return data.error
    if ("result" in data && data.result === "ERROR" && data.message) return data.message
  } catch {
    return null
  }

  return null
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("로그인 후 이용할 수 있습니다.")
    }
    if (response.status === 403) {
      throw new Error("현재 계정으로는 해당 챗봇 문서에 접근할 수 없습니다.")
    }
    throw new Error((await extractErrorMessage(response)) || fallbackMessage)
  }

  const payload = (await response.json()) as ApiResponse<T>
  if (payload.result !== "SUCCESS" || payload.data == null) {
    throw new Error(payload.message || fallbackMessage)
  }

  return payload.data
}

async function parseApiSuccess(response: Response, fallbackMessage: string): Promise<void> {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("로그인 후 이용할 수 있습니다.")
    }
    if (response.status === 403) {
      throw new Error("현재 계정으로는 해당 챗봇 문서에 접근할 수 없습니다.")
    }
    throw new Error((await extractErrorMessage(response)) || fallbackMessage)
  }

  const payload = (await response.json()) as ApiResponse<unknown>
  if (payload.result !== "SUCCESS") {
    throw new Error(payload.message || fallbackMessage)
  }
}

export async function postChatbotAnswer(body: ChatbotAnswerRequest) {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/answer`, {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  })

  return parseApiResponse<ChatbotAnswerPayload>(response, "챗봇 답변 요청에 실패했습니다.")
}

export async function uploadChatbotAttachment(sessionId: string, file: File) {
  const formData = new FormData()
  formData.append("sessionId", sessionId)
  formData.append("file", file)

  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/attachments`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData,
  })

  return parseApiResponse<UploadedChatbotAttachment>(response, "첨부파일 업로드에 실패했습니다.")
}

export async function deleteChatbotAttachment(sessionId: string, fileId: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/attachments`, {
    method: "DELETE",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      sessionId,
      fileId,
    }),
  })

  await parseApiResponse<{ ok: boolean }>(response, "첨부파일 삭제에 실패했습니다.")
}

export async function getChatbotSessions() {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/sessions`, {
    method: "GET",
    headers: buildAuthHeaders(),
  })

  return parseApiResponse<ChatSessionPayload[]>(response, "챗봇 세션 목록 조회에 실패했습니다.")
}

export async function createChatbotSession(title: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/sessions`, {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ title }),
  })

  return parseApiResponse<ChatSessionPayload>(response, "챗봇 세션 생성에 실패했습니다.")
}

export async function updateChatbotSessionTitle(sessionId: string, title: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/sessions/${sessionId}/title`, {
    method: "PUT",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ title }),
  })

  return parseApiResponse<ChatSessionPayload>(response, "챗봇 세션 제목 수정에 실패했습니다.")
}

export async function deleteChatbotSession(sessionId: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/sessions/${sessionId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
  })

  await parseApiSuccess(response, "챗봇 세션 삭제에 실패했습니다.")
}

export async function getChatbotSessionMessages(sessionId: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/sessions/${sessionId}/messages`, {
    method: "GET",
    headers: buildAuthHeaders(),
  })

  return parseApiResponse<ChatMessagePayload[]>(response, "챗봇 메시지 조회에 실패했습니다.")
}

export async function addChatbotSessionMessages(
  sessionId: string,
  body: {
    userContent: string
    assistantContent: string
    threadId?: string | null
    route?: string | null
    answerStatus?: string | null
    evidences?: string | null
    typedEvidences?: string | null
    actions?: string | null
  },
) {
  const response = await fetch(`${getBackendApiBaseUrl()}/chatbot/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  })

  return parseApiResponse<ChatMessagePayload[]>(response, "챗봇 메시지 저장에 실패했습니다.")
}
