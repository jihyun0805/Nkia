"use client"

import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent } from "react"

import {
  deleteChatbotAttachment,
  postChatbotAnswer,
  type ChatbotEvidence,
  type ChatbotTypedEvidences,
  uploadChatbotAttachment,
  type UploadedChatbotAttachment,
} from "@/lib/chatbot-api"
import { loadAuthSession, subscribeAuthSession } from "@/lib/auth-session"
import { useToast } from "@/hooks/use-toast"
import {
  Bot,
  ChevronDown,
  FilePlus2,
  FileText,
  History,
  LoaderCircle,
  MessageSquarePlus,
  Paperclip,
  Search,
  SendHorizonal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  evidences?: ChatbotEvidence[]
  typedEvidences?: ChatbotTypedEvidences
}

type ChatSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

type PendingAttachment = {
  localId: string
  file: File
  fileName: string
  size: number
  fileType: string
}

const STORAGE_KEY = "orbis-chatbot-sessions"
const MAX_HISTORY_MESSAGES = 8
const DEFAULT_LIMIT = 5

const EXAMPLE_PROMPTS = [
  "유상 유지보수 중 활동이 가장 많았던 사업을 근거와 함께 알려줘",
  "이번 달 수주 실적을 요약해줘",
  "최근 PRB 문서에서 반복된 리스크를 알려줘",
  "업로드한 문서와 비슷한 영업기회를 찾아줘",
]

const SOURCE_TYPE_LABELS: Record<string, string> = {
  ATTACHMENT: "첨부파일",
  COMPANY: "고객/협력사",
  CONTACT: "담당자",
  OPPORTUNITY: "사업기회",
  QUOTATION: "견적서",
  RFP_ANALYSIS: "RFP 분석",
  PRB: "PRB",
  PRB_RESULT: "PRB 결과",
  BID_RESULT: "입찰결과",
  PROPOSAL: "제안서",
  ORDER_REPORT: "수주보고",
  CONTRACT: "계약",
  LICENSE: "라이선스",
  PROJECT: "프로젝트",
  BILLING: "청구",
  MAINTENANCE: "유지보수",
  CUSTOMER_SUPPORT: "고객지원",
  MAINTENANCE_QUOTE: "유지보수 견적",
}

function createId() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: createId(),
    role: "assistant",
    content:
      "안녕하세요. 오르비스 AI 챗봇입니다. 영업 문서 검색, 업무 질의, 업로드 문서 비교 요청을 보낼 수 있습니다.",
    createdAt: nowIso(),
  }
}

function createSession(title = "새 대화"): ChatSession {
  const timestamp = nowIso()
  return {
    id: createId(),
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [createWelcomeMessage()],
  }
}

function summarizeTitle(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (!trimmed) return "새 대화"
  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}...` : trimmed
}

function formatRelativeDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatBytes(size: number) {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

function buildEvidenceSections(
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

function createPreviewResponse(query: string, attachmentCount: number): string {
  const lines = [
    "현재는 챗봇 FE만 먼저 이관된 미리보기 모드입니다.",
    "DB 엔티티, CRUD API, 색인 API가 아직 연결되지 않아 실제 검색 답변은 제공되지 않습니다.",
    "",
    `질문: ${query}`,
  ]

  if (attachmentCount > 0) {
    lines.push(`첨부: ${attachmentCount}건이 현재 세션에만 보관되어 있습니다.`)
  }

  lines.push("", "백엔드 준비가 끝나면 같은 UI에서 실제 답변과 근거 목록이 바로 연결됩니다.")
  return lines.join("\n")
}

function normalizeStoredSessions(raw: string | null) {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Array<Partial<ChatSession>>
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null
    }

    return parsed.map((session) => ({
      id: session.id || createId(),
      title: session.title || "새 대화",
      createdAt: session.createdAt || nowIso(),
      updatedAt: session.updatedAt || session.createdAt || nowIso(),
      messages:
        Array.isArray(session.messages) && session.messages.length > 0
          ? session.messages.map((message) => ({
              id: message.id || createId(),
              role: message.role === "user" ? "user" : "assistant",
              content: message.content || "",
              createdAt: message.createdAt || nowIso(),
              evidences: message.evidences,
              typedEvidences: message.typedEvidences,
            }))
          : [createWelcomeMessage()],
    }))
  } catch {
    return null
  }
}

export function ChatbotModal() {
  const { toast } = useToast()
  const [hasAuthSession, setHasAuthSession] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [openEvidenceMessageIds, setOpenEvidenceMessageIds] = useState<string[]>([])
  const [openEvidenceItemKeys, setOpenEvidenceItemKeys] = useState<string[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true)
  const [pendingAttachmentsBySession, setPendingAttachmentsBySession] = useState<
    Record<string, PendingAttachment[]>
  >({})
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const sync = () => setHasAuthSession(Boolean(loadAuthSession()))

    sync()
    return subscribeAuthSession(sync)
  }, [])

  useEffect(() => {
    const stored = normalizeStoredSessions(localStorage.getItem(STORAGE_KEY))
    if (!stored) {
      const initial = createSession()
      setSessions([initial])
      setActiveSessionId(initial.id)
      return
    }

    setSessions(stored)
    setActiveSessionId(stored[0]?.id ?? null)
  }, [])

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [activeSessionId, sessions, isLoading, isOpen])

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null
  const activePendingAttachments = activeSession ? pendingAttachmentsBySession[activeSession.id] ?? [] : []

  const openChat = () => {
    setIsOpen(true)
    if (!activeSessionId && sessions[0]) {
      setActiveSessionId(sessions[0].id)
    }
    window.setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const createNewConversation = () => {
    const session = createSession()
    setSessions((current) => [session, ...current])
    setActiveSessionId(session.id)
    setDraft("")
    setErrorMessage("")
    setEditingSessionId(null)
    setEditingTitle("")
    setOpenEvidenceMessageIds([])
    setOpenEvidenceItemKeys([])
    setIsOpen(true)
    window.setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const updateSession = (sessionId: string, updater: (session: ChatSession) => ChatSession) => {
    setSessions((current) =>
      current
        .map((session) => (session.id === sessionId ? updater(session) : session))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    )
  }

  const toggleEvidence = (messageId: string) => {
    setOpenEvidenceMessageIds((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId],
    )
  }

  const toggleEvidenceItem = (itemKey: string) => {
    setOpenEvidenceItemKeys((current) =>
      current.includes(itemKey)
        ? current.filter((key) => key !== itemKey)
        : [...current, itemKey],
    )
  }

  const startEditingConversation = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditingTitle(session.title)
  }

  const saveConversationTitle = (sessionId: string) => {
    const nextTitle = editingTitle.trim() || "새 대화"
    const updatedAt = nowIso()
    updateSession(sessionId, (session) => ({
      ...session,
      title: nextTitle,
      updatedAt,
    }))
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const cancelEditingConversation = () => {
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const getEvidenceReference = (evidence: ChatbotEvidence) => {
    const metadata = evidence.metadata ?? {}
    const candidateKeys = [
      "opportunityCode",
      "maintenanceCode",
      "projectCode",
      "wonReportCode",
      "prbCode",
      "prbResultCode",
      "rfpAnalysisCode",
      "supportCode",
      "contractCode",
      "quoteCode",
      "licenseCode",
      "fileName",
    ] as const

    for (const key of candidateKeys) {
      const value = metadata[key]
      if (typeof value === "string" && value.trim()) {
        return value.trim()
      }
    }

    if (evidence.title?.trim()) {
      return evidence.title.trim()
    }

    return `${evidence.sourceType}-${evidence.sourceId}`
  }

  const useEvidenceAsFollowUp = (evidence: ChatbotEvidence) => {
    const reference = getEvidenceReference(evidence)
    setDraft(`${reference} 기준으로 주요 내용과 관련 근거를 더 자세히 설명해줘`)
    textareaRef.current?.focus()
  }

  const deleteConversation = (sessionId: string) => {
    const targetSession = sessions.find((session) => session.id === sessionId)
    const confirmed = window.confirm(`'${targetSession?.title ?? "이 대화"}' 대화를 삭제하시겠습니까?`)
    if (!confirmed || !targetSession) {
      return
    }

    setSessions((current) => {
      const remaining = current.filter((session) => session.id !== sessionId)
      if (remaining.length === 0) {
        const next = createSession()
        setActiveSessionId(next.id)
        setOpenEvidenceMessageIds([])
        setOpenEvidenceItemKeys([])
        setEditingSessionId(null)
        setEditingTitle("")
        return [next]
      }

      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id)
      }
      setOpenEvidenceMessageIds([])
      setOpenEvidenceItemKeys([])
      if (editingSessionId === sessionId) {
        setEditingSessionId(null)
        setEditingTitle("")
      }
      return remaining
    })

    setPendingAttachmentsBySession((current) => {
      const next = { ...current }
      delete next[sessionId]
      return next
    })
  }

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || !activeSession) return

    setIsUploading(true)
    try {
      const nextAttachments = Array.from(fileList).map((file) => ({
        localId: createId(),
        file,
        fileName: file.name,
        size: file.size,
        fileType: file.type || "application/octet-stream",
      }))

      setPendingAttachmentsBySession((current) => ({
        ...current,
        [activeSession.id]: [...(current[activeSession.id] ?? []), ...nextAttachments],
      }))

      toast({
        title: "첨부파일 추가 완료",
        description: hasAuthSession
          ? "파일은 보내기 시점에 임시 색인됩니다."
          : "현재는 FE 미리보기 모드라 첨부가 브라우저 세션에만 보관됩니다.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "첨부파일 추가에 실패했습니다."
      setErrorMessage(message)
      toast({
        title: "업로드 실패",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removePendingAttachment = (sessionId: string, localId: string) => {
    setPendingAttachmentsBySession((current) => ({
      ...current,
      [sessionId]: (current[sessionId] ?? []).filter((attachment) => attachment.localId !== localId),
    }))
  }

  const appendAssistantMessage = (sessionId: string, message: ChatMessage) => {
    updateSession(sessionId, (session) => ({
      ...session,
      updatedAt: message.createdAt,
      messages: [...session.messages, message],
    }))
  }

  const sendMessage = async () => {
    const query = draft.trim()
    if (!query || !activeSession) return

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: query,
      createdAt: nowIso(),
    }

    const history = activeSession.messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
      role: message.role,
      content: message.content,
    }))

    updateSession(activeSession.id, (session) => ({
      ...session,
      title: session.messages.length <= 1 ? summarizeTitle(query) : session.title,
      updatedAt: userMessage.createdAt,
      messages: [...session.messages, userMessage],
    }))
    setDraft("")
    setIsLoading(true)
    setErrorMessage("")

    const pendingAttachments = pendingAttachmentsBySession[activeSession.id] ?? []
    if (!hasAuthSession) {
      const previewMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: createPreviewResponse(query, pendingAttachments.length),
        createdAt: nowIso(),
      }
      appendAssistantMessage(activeSession.id, previewMessage)
      setIsLoading(false)
      return
    }

    const requestAttachmentSessionId = pendingAttachments.length > 0 ? createId() : null
    const indexedAttachments: UploadedChatbotAttachment[] = []

    try {
      if (requestAttachmentSessionId) {
        setIsUploading(true)

        for (const attachment of pendingAttachments) {
          indexedAttachments.push(
            await uploadChatbotAttachment(requestAttachmentSessionId, attachment.file),
          )
        }
      }

      const data = await postChatbotAnswer({
        query,
        limit: DEFAULT_LIMIT,
        history,
        threadId: activeSession.id,
        attachmentSessionId: requestAttachmentSessionId,
        startAt: null,
        endAt: null,
      })

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.answer,
        createdAt: nowIso(),
        evidences: data.evidences,
        typedEvidences: data.typedEvidences,
      }

      appendAssistantMessage(activeSession.id, assistantMessage)
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 요청 중 오류가 발생했습니다."
      setErrorMessage(message)
      appendAssistantMessage(activeSession.id, {
        id: createId(),
        role: "assistant",
        content: `요청 처리 중 오류가 발생했습니다.\n${message}`,
        createdAt: nowIso(),
      })
    } finally {
      if (requestAttachmentSessionId && indexedAttachments.length > 0) {
        const cleanupResults = await Promise.allSettled(
          indexedAttachments.map((attachment) =>
            deleteChatbotAttachment(requestAttachmentSessionId, attachment.fileId),
          ),
        )

        const hasCleanupFailure = cleanupResults.some((result) => result.status === "rejected")
        if (hasCleanupFailure) {
          toast({
            title: "임시 첨부파일 정리 실패",
            description: "다음 요청 전에 AI 임시 첨부파일 정리가 완전히 끝나지 않았습니다.",
            variant: "destructive",
          })
        }
      }

      setIsUploading(false)
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (!isLoading) {
        void sendMessage()
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openChat}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 items-center justify-center gap-2 rounded-full border border-sky-400/30 bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:bg-slate-900"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">
          <Bot className="h-4 w-4" />
        </span>
        AI 챗봇
        <span className={`h-2 w-2 rounded-full ${hasAuthSession ? "bg-emerald-400" : "bg-amber-400"}`} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm">
          <div className="absolute inset-x-3 bottom-3 top-3 overflow-hidden rounded-[28px] border border-white/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_36%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.98))] shadow-[0_30px_80px_rgba(15,23,42,0.35)] md:inset-auto md:bottom-6 md:right-6 md:top-auto md:h-[680px] md:w-[1120px] lg:w-[1200px]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.05),transparent_35%,rgba(15,23,42,0.04))]" />
            <div className="relative flex h-full">
              <aside className="hidden w-[270px] flex-col border-r border-slate-800/70 bg-slate-950 text-slate-100 md:flex">
                <div className="border-b border-white/10 px-5 py-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-tight text-white">Orbis AI Chat</div>
                      <div className="text-xs text-slate-400">문서 검색 · 질의 · 비교</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-slate-400">대화</div>
                      <div className="mt-1 text-base font-semibold text-white">{sessions.length}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-slate-400">첨부</div>
                      <div className="mt-1 text-base font-semibold text-white">
                        {activePendingAttachments.length}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <History className="h-4 w-4 text-sky-300" />
                      대화 세션
                    </div>
                    <div className="mt-1 text-xs text-slate-400">질문 흐름과 세션 기록을 브라우저에 보관합니다</div>
                  </div>
                  <button
                    type="button"
                    onClick={createNewConversation}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-slate-900 transition-colors hover:bg-sky-50"
                  >
                    새 대화
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="space-y-2">
                    {sessions.map((session) => {
                      const isActive = session.id === activeSession?.id
                      const isEditing = session.id === editingSessionId

                      return (
                        <div
                          key={session.id}
                          className={`rounded-2xl border transition-all ${
                            isActive
                              ? "border-sky-300/30 bg-sky-400/10 shadow-[0_12px_30px_rgba(14,165,233,0.12)]"
                              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-2 p-3.5">
                            <button
                              type="button"
                              onClick={() => setActiveSessionId(session.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              {isEditing ? (
                                <input
                                  value={editingTitle}
                                  onChange={(event) => setEditingTitle(event.target.value)}
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault()
                                      saveConversationTitle(session.id)
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault()
                                      cancelEditingConversation()
                                    }
                                  }}
                                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                                  autoFocus
                                />
                              ) : (
                                <div className="truncate text-sm font-semibold text-white">{session.title}</div>
                              )}
                              <div className="mt-1 text-xs text-slate-400">{formatRelativeDate(session.updatedAt)}</div>
                              <div className="mt-2 truncate text-xs text-slate-500">
                                {session.messages.at(-1)?.content ?? "대화가 아직 없습니다."}
                              </div>
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => saveConversationTitle(session.id)}
                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-2 text-[11px] font-semibold text-white hover:bg-white/15"
                                  >
                                    저장
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditingConversation}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                                    aria-label={`${session.title} 편집 취소`}
                                    title="편집 취소"
                                  >
                                    X
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditingConversation(session)}
                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                                    aria-label={`${session.title} 이름 수정`}
                                    title="이름 수정"
                                  >
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteConversation(session.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-300 hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-200"
                                    aria-label={`${session.title} 삭제`}
                                    title="대화 삭제"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </aside>

              <section className="flex min-w-0 flex-1 flex-col bg-transparent">
                <div className="border-b border-slate-200/80 bg-white/75 px-4 py-3 backdrop-blur md:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold tracking-tight text-slate-950">
                            {activeSession?.title ?? "새 대화"}
                          </div>
                          <div className="text-xs text-slate-500">근거 기반 답변 · 업로드 문서 비교 · 후속 질문</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`hidden rounded-full border px-3 py-1 text-[11px] font-medium md:block ${
                          hasAuthSession
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {hasAuthSession ? "API 연결 모드" : "UI 미리보기 모드"}
                      </div>
                      <button
                        type="button"
                        onClick={createNewConversation}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700 md:hidden"
                      >
                        <MessageSquarePlus className="mr-1 h-4 w-4" />
                        새 대화
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                      >
                        X
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur md:px-6">
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setIsQuickActionsOpen((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <Search className="h-3.5 w-3.5" />
                        빠른 질문
                      </div>
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                        {isQuickActionsOpen ? "접기" : "펼치기"}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isQuickActionsOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>

                    {isQuickActionsOpen ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {EXAMPLE_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => setDraft(prompt)}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fbff_0%,#f6f8fc_35%,#f8fafc_100%)] px-4 py-4 md:px-6">
                  {activeSession && activeSession.messages.length > 0 ? (
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
                            <div className="whitespace-pre-wrap">{message.content}</div>

                            {message.role === "assistant" && message.evidences && message.evidences.length > 0 && (
                              <div className="mt-5 border-t border-slate-100 pt-4">
                                <button
                                  type="button"
                                  onClick={() => toggleEvidence(message.id)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>사용 근거 {message.evidences.length}건</span>
                                  <span>{openEvidenceMessageIds.includes(message.id) ? "숨기기" : "보기"}</span>
                                </button>

                                {openEvidenceMessageIds.includes(message.id) && (
                                  <div className="mt-3 space-y-3">
                                    {buildEvidenceSections(message.evidences, message.typedEvidences).map(
                                      (section) => (
                                        <div key={section.key} className="space-y-3">
                                          <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            {section.title}
                                          </div>
                                          {section.evidences.map((evidence) => {
                                            const evidenceKey = `${message.id}-${section.key}-${evidence.sourceType}-${evidence.sourceId}-${evidence.chunkIndex}`
                                            const isEvidenceOpen = openEvidenceItemKeys.includes(evidenceKey)

                                            return (
                                              <div
                                                key={evidenceKey}
                                                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90"
                                              >
                                                <button
                                                  type="button"
                                                  onClick={() => toggleEvidenceItem(evidenceKey)}
                                                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
                                                >
                                                  <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900">
                                                      {evidence.title ?? `${evidence.sourceType}-${evidence.sourceId}`}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                        {SOURCE_TYPE_LABELS[evidence.sourceType] ?? evidence.sourceType}
                                                      </span>
                                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                        {evidence.evidenceType ?? "retrieved_evidence"}
                                                      </span>
                                                      {(evidence.matchedBy ?? ["vector"]).map((method) => (
                                                        <span
                                                          key={method}
                                                          className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700"
                                                        >
                                                          {method}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                                    <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                                                      final {(evidence.finalScore ?? 0).toFixed(3)}
                                                    </span>
                                                    <span>{isEvidenceOpen ? "숨기기" : "보기"}</span>
                                                  </div>
                                                </button>

                                                {isEvidenceOpen && (
                                                  <div className="border-t border-slate-200 bg-white px-4 py-4 text-xs leading-6 text-slate-600">
                                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={() => useEvidenceAsFollowUp(evidence)}
                                                        className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700"
                                                      >
                                                        이 문서로 다시 질문
                                                      </button>
                                                      <span className="text-[11px] text-slate-500">
                                                        기준 코드 {getEvidenceReference(evidence)}
                                                      </span>
                                                    </div>
                                                    <div className="mb-2 text-[11px] text-slate-500">
                                                      v {(evidence.vectorScore ?? 0).toFixed(3)} / k {(evidence.keywordScore ?? 0).toFixed(3)} / 거리 {evidence.distance.toFixed(4)}
                                                    </div>
                                                    <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 font-sans">
                                                      {evidence.content}
                                                    </pre>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
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
                  ) : (
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
                  )}
                </div>

                <div className="border-t border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur md:px-6">
                  {errorMessage && (
                    <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".txt,.md,.markdown,.csv,.json,.xml,.yaml,.yml,text/*,application/json,application/xml"
                    onChange={(event) => {
                      void handleUploadFiles(event.target.files)
                    }}
                  />

                  {activePendingAttachments.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {activePendingAttachments.map((attachment) => (
                        <div
                          key={attachment.localId}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                            <Paperclip className="h-3 w-3" />
                          </span>
                          <span className="max-w-[220px] truncate">{attachment.fileName}</span>
                          <span className="text-slate-400">{formatBytes(attachment.size)}</span>
                          <button
                            type="button"
                            onClick={() => activeSession && removePendingAttachment(activeSession.id, attachment.localId)}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-red-600"
                            aria-label={`${attachment.fileName} 제거`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !activeSession}
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      aria-label="첨부 업로드"
                      title="첨부 업로드"
                    >
                      {isUploading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <FilePlus2 className="h-4 w-4" />
                      )}
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="업무 코드나 고객사, 요구사항을 입력하세요"
                      className="min-h-[84px] flex-1 resize-none rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={isLoading || !draft.trim() || !activeSession}
                      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-5 text-sm font-semibold text-white transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <SendHorizonal className="h-4 w-4" />
                      보내기
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {hasAuthSession
                        ? "첨부 문서는 전송 시 임시 색인 후 바로 정리됩니다."
                        : "현재는 FE만 연결되어 첨부와 대화 기록이 브라우저 세션에만 저장됩니다."}
                    </span>
                    <span>
                      {activePendingAttachments.length > 0
                        ? `첨부 ${activePendingAttachments.length}건 준비됨`
                        : "첨부 없음"}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
