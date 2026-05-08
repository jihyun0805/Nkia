"use client"

import { FileText } from "lucide-react"
import type { ChatbotEvidence } from "@/lib/chatbot-api"
import type { ChatMessage } from "./types"
import { SOURCE_TYPE_LABELS } from "./constants"
import { buildEvidenceSections } from "./utils"

type ChatEvidenceProps = {
  message: ChatMessage
  openEvidenceMessageIds: string[]
  openEvidenceItemKeys: string[]
  onToggleEvidence: (messageId: string) => void
  onToggleEvidenceItem: (itemKey: string) => void
  onUseAsFollowUp: (evidence: ChatbotEvidence) => void
  getEvidenceReference: (evidence: ChatbotEvidence) => string
}

export function ChatEvidence({
  message,
  openEvidenceMessageIds,
  openEvidenceItemKeys,
  onToggleEvidence,
  onToggleEvidenceItem,
  onUseAsFollowUp,
  getEvidenceReference,
}: ChatEvidenceProps) {
  if (!message.evidences || message.evidences.length === 0) {
    return null
  }

  const isOpen = openEvidenceMessageIds.includes(message.id)

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={() => onToggleEvidence(message.id)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700"
      >
        <FileText className="h-3.5 w-3.5" />
        <span>사용 근거 {message.evidences.length}건</span>
        <span>{isOpen ? "숨기기" : "보기"}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {buildEvidenceSections(message.evidences, message.typedEvidences).map((section) => (
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
                      onClick={() => onToggleEvidenceItem(evidenceKey)}
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
                            onClick={() => onUseAsFollowUp(evidence)}
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
          ))}
        </div>
      )}
    </div>
  )
}
