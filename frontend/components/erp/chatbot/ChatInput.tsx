// 인수인계: 챗봇 입력창과 첨부파일 선택 UI입니다.
// 핵심 흐름: Enter 전송, Shift+Enter 줄바꿈, 업로드 버튼, pending attachment 삭제 이벤트를 부모 모달로 올립니다.
// 같이 확인: 입력 UX 변경 시 ChatbotModal의 sendMessage/isAnswering 상태와 함께 확인하세요.
"use client"

import { useRef } from "react"
import type { KeyboardEvent } from "react"
import { FilePlus2, LoaderCircle, Paperclip, SendHorizonal, X } from "lucide-react"
import type { ChatSession, PendingAttachment } from "./types"
import { formatBytes } from "./utils"

type ChatInputProps = {
  activeSession: ChatSession | null
  draft: string
  isLoading: boolean
  isUploading: boolean
  errorMessage: string
  activePendingAttachments: PendingAttachment[]
  onDraftChange: (value: string) => void
  onSend: () => void
  onUploadFiles: (fileList: FileList | null) => void
  onRemovePendingAttachment: (sessionId: string, localId: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatInput({
  activeSession,
  draft,
  isLoading,
  isUploading,
  errorMessage,
  activePendingAttachments,
  onDraftChange,
  onSend,
  onUploadFiles,
  onRemovePendingAttachment,
  textareaRef,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (!isLoading) {
        onSend()
      }
    }
  }

  return (
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
          onUploadFiles(event.target.files)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }}
      />

      {activePendingAttachments.length > 0 && (
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
                onClick={() =>
                  activeSession && onRemovePendingAttachment(activeSession.id, attachment.localId)
                }
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-red-600"
                aria-label={`${attachment.fileName} 제거`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

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
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="업무 코드나 고객사, 요구사항을 입력하세요"
          className="min-h-[84px] flex-1 resize-none rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={isLoading || !draft.trim() || !activeSession}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-5 text-sm font-semibold text-white transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <SendHorizonal className="h-4 w-4" />
          보내기
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>첨부 문서는 전송 시 임시 색인 후 바로 정리됩니다.</span>
        <span>
          {activePendingAttachments.length > 0
            ? `첨부 ${activePendingAttachments.length}건 준비됨`
            : "첨부 없음"}
        </span>
      </div>
    </div>
  )
}
