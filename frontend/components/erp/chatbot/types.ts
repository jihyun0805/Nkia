// 인수인계: 프론트 챗봇 내부 상태 타입입니다.
// 핵심 흐름: 서버 payload를 화면 상태(ChatSession, ChatMessage, PendingAttachment)로 바꾼 뒤 컴포넌트들이 이 타입을 공유합니다.
// 같이 확인: API DTO 변경 시 frontend/lib/chatbot-api.ts와 mapChatMessagePayload를 같이 수정하세요.
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
