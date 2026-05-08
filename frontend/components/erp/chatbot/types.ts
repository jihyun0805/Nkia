import type { ChatbotDraftAction, ChatbotEvidence, ChatbotTypedEvidences } from "@/lib/chatbot-api"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  threadId?: string
  route?: string
  answerStatus?: string
  evidences?: ChatbotEvidence[]
  typedEvidences?: ChatbotTypedEvidences
  actions?: ChatbotDraftAction[]
  isStreaming?: boolean
}

export type ChatSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export type PendingAttachment = {
  localId: string
  file: File
  fileName: string
  size: number
  fileType: string
}
