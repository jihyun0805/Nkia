"use client"

import { useEffect, useRef, useState } from "react"
import { LoaderCircle, Sparkles } from "lucide-react"
import type { ChatbotEvidence } from "@/lib/chatbot-api"
import type { ChatMessage, ChatSession } from "./types"
import { ChatActions } from "./ChatActions"
import { ChatEvidence } from "./ChatEvidence"

type ChatMessagesProps = {
  activeSession: ChatSession | null
  isLoading: boolean
  openEvidenceMessageIds: string[]
  openEvidenceItemKeys: string[]
  onToggleEvidence: (messageId: string) => void
  onToggleEvidenceItem: (itemKey: string) => void
  onUseAsFollowUp: (evidence: ChatbotEvidence) => void
  getEvidenceReference: (evidence: ChatbotEvidence) => string
  onStreamingDone: (messageId: string, fullContent: string) => void
}

const TYPING_INTERVAL_MS = 10

function StreamingMessage({
  message,
  onDone,
}: {
  message: ChatMessage
  onDone: (id: string, fullContent: string) => void
}) {
  const [displayed, setDisplayed] = useState("")
  const fullContent = useRef(message.content)
  const indexRef = useRef(0)

  useEffect(() => {
    fullContent.current = message.content
    indexRef.current = 0
    setDisplayed("")

    const interval = window.setInterval(() => {
      indexRef.current += 1
      const next = fullContent.current.slice(0, indexRef.current)
      setDisplayed(next)
      if (indexRef.current >= fullContent.current.length) {
        window.clearInterval(interval)
        onDone(message.id, fullContent.current)
      }
    }, TYPING_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [message.id, message.content, onDone])

  return (
    <span className="whitespace-pre-wrap">
      {displayed}
      <span className="animate-pulse">▌</span>
    </span>
  )
}

export function ChatMessages({
  activeSession,
  isLoading,
  openEvidenceMessageIds,
  openEvidenceItemKeys,
  onToggleEvidence,
  onToggleEvidenceItem,
  onUseAsFollowUp,
  getEvidenceReference,
  onStreamingDone,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [activeSession, isLoading])

  if (!activeSession || activeSession.messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="mt-4 text-lg font-semibold tracking-tight text-slate-900">새 대화를 시작하세요</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">
            업무 코드, 고객사, 유지보수 내역, 제안서 비교 요청처럼 구체적인 질문일수록 더 정확한 근거를 찾습니다.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeSession.messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[960px] rounded-[24px] px-4 py-4 text-sm leading-7 shadow-sm ${
              message.role === "user"
                ? "bg-slate-950 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)]"
                : "border border-slate-200/90 bg-white text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {message.role === "user" ? (
                <span className="rounded-full bg-white/10 px-2 py-1 text-slate-200">사용자</span>
              ) : (
                <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">Orbis AI</span>
              )}
            </div>

            {message.role === "assistant" && message.isStreaming ? (
              <StreamingMessage message={message} onDone={onStreamingDone} />
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}

            {message.role === "assistant" && !message.isStreaming && (
              <>
                <ChatActions actions={message.actions} />
                <ChatEvidence
                  message={message}
                  openEvidenceMessageIds={openEvidenceMessageIds}
                  openEvidenceItemKeys={openEvidenceItemKeys}
                  onToggleEvidence={onToggleEvidence}
                  onToggleEvidenceItem={onToggleEvidenceItem}
                  onUseAsFollowUp={onUseAsFollowUp}
                  getEvidenceReference={getEvidenceReference}
                />
              </>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
            <div className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin text-sky-600" />
              답변 생성 중
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
