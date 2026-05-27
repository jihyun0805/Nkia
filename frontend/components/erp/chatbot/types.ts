// 인수인계 메모: 챗봇 UI 하위 컴포넌트입니다. 모달 본문을 입력창, 메시지, 근거, 액션, 사이드바로 나눠 관리합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
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
