import type {
  ChatbotDraftAction,
  ChatbotEvidence,
  ChatbotTypedEvidences,
  ChatMessagePayload,
  ChatSessionPayload,
} from "@/lib/chatbot-api"
import type { ChatMessage, ChatSession } from "./types"

export function createId() {
  return crypto.randomUUID()
}

export function nowIso() {
  return new Date().toISOString()
}

export function summarizeTitle(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (!trimmed) return "새 대화"
  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}...` : trimmed
}

export function formatRelativeDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

export function buildEvidenceSections(
  evidences: ChatbotEvidence[] | undefined,
  typedEvidences: ChatbotTypedEvidences | undefined,
) {
  if (typedEvidences) {
    return [
      {
        key: "retrieved",
        title: "검색 근거",
        evidences: typedEvidences.retrievedEvidence ?? [],
      },
      {
        key: "structured",
        title: "정형 근거",
        evidences: typedEvidences.structuredEvidence ?? [],
      },
      {
        key: "derived",
        title: "요약 근거",
        evidences: typedEvidences.derivedSummaryEvidence ?? [],
      },
    ].filter((section) => section.evidences.length > 0)
  }

  return [
    {
      key: "all",
      title: "사용 근거",
      evidences: evidences ?? [],
    },
  ].filter((section) => section.evidences.length > 0)
}

function flattenTypedEvidences(typedEvidences: ChatbotTypedEvidences | undefined) {
  if (!typedEvidences) {
    return []
  }

  try {
    return [
      ...(typedEvidences.retrievedEvidence ?? []),
      ...(typedEvidences.structuredEvidence ?? []),
      ...(typedEvidences.derivedSummaryEvidence ?? []),
    ]
  } catch {
    return []
  }
}

function parseJson<T>(raw: string | null | undefined): T | undefined {
  if (!raw) {
    return undefined
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

export function mapChatMessagePayload(message: ChatMessagePayload): ChatMessage {
  const typedEvidences = parseJson<ChatbotTypedEvidences>(message.typedEvidences)
  const evidences = parseJson<ChatbotEvidence[]>(message.evidences) ?? flattenTypedEvidences(typedEvidences)
  const actions = parseJson<ChatbotDraftAction[]>(message.actions)

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    threadId: message.threadId ?? undefined,
    route: message.route ?? undefined,
    answerStatus: message.answerStatus ?? undefined,
    evidences: evidences.length > 0 ? evidences : undefined,
    typedEvidences,
    actions,
  }
}

export function mapChatSessionPayload(session: ChatSessionPayload, messages: ChatMessage[] = []): ChatSession {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages,
  }
}
