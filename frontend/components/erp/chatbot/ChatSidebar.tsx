// 인수인계 메모: 챗봇 UI 하위 컴포넌트입니다. 모달 본문을 입력창, 메시지, 근거, 액션, 사이드바로 나눠 관리합니다.
// 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
"use client"

import { History, Sparkles, Trash2 } from "lucide-react"
import type { ChatSession, PendingAttachment } from "./types"
import { formatRelativeDate } from "./utils"

type ChatSidebarProps = {
  sessions: ChatSession[]
  activeSession: ChatSession | null
  activePendingAttachments: PendingAttachment[]
  editingSessionId: string | null
  editingTitle: string
  onSelectSession: (sessionId: string) => void
  onNewConversation: () => void
  onStartEditing: (session: ChatSession) => void
  onSaveTitle: (sessionId: string) => void
  onCancelEditing: () => void
  onDeleteConversation: (sessionId: string) => void
  onEditingTitleChange: (title: string) => void
}

export function ChatSidebar({
  sessions,
  activeSession,
  activePendingAttachments,
  editingSessionId,
  editingTitle,
  onSelectSession,
  onNewConversation,
  onStartEditing,
  onSaveTitle,
  onCancelEditing,
  onDeleteConversation,
  onEditingTitleChange,
}: ChatSidebarProps) {
  return (
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
          <div className="mt-1 text-xs text-slate-400">질문 흐름과 세션 기록을 서버에 보관합니다</div>
        </div>
        <button
          type="button"
          onClick={onNewConversation}
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
                    onClick={() => onSelectSession(session.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    {isEditing ? (
                      <input
                        value={editingTitle}
                        onChange={(event) => onEditingTitleChange(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            onSaveTitle(session.id)
                          }
                          if (event.key === "Escape") {
                            event.preventDefault()
                            onCancelEditing()
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
                          onClick={() => onSaveTitle(session.id)}
                          className="inline-flex h-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-2 text-[11px] font-semibold text-white hover:bg-white/15"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEditing}
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
                          onClick={() => onStartEditing(session)}
                          className="inline-flex h-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                          aria-label={`${session.title} 이름 수정`}
                          title="이름 수정"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteConversation(session.id)}
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
  )
}
