"use client"

import { Pencil, FileText, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import type {
  ChatbotDraftAction,
  ChatbotEditFieldPayload,
  ChatbotNavigatePayload,
} from "@/lib/chatbot-api"

type ChatActionsProps = {
  actions?: ChatbotDraftAction[]
}

/**
 * 챗봇 응답에 포함된 actions 배열을 버튼으로 렌더.
 *
 * - edit_field: 특정 entity 페이지로 navigate + field_updates 를 query param
 *   (chatbotPrefill_<field>=<value>) 으로 전달. 각 페이지의 폼이 이 prefix
 *   query param 을 읽어 폼 prefill.
 * - navigate: 단순 페이지 이동.
 * - create_draft: 기존 초안 작성 액션 (별도 채널로 처리 가능, 여기서는 라벨만 노출).
 */
export function ChatActions({ actions }: ChatActionsProps) {
  const router = useRouter()
  if (!actions || actions.length === 0) {
    return null
  }

  const handleClick = (action: ChatbotDraftAction) => {
    if (action.type === "edit_field") {
      const payload = action.payload as ChatbotEditFieldPayload
      const url = appendPrefillParams(payload.entity_route, payload.field_updates)
      router.push(url)
      return
    }
    if (action.type === "navigate") {
      const payload = action.payload as ChatbotNavigatePayload
      router.push(payload.href)
      return
    }
    // create_draft: 추후 별도 모달/사이드패널로 처리. 우선은 콘솔로 노출만.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[ChatActions] create_draft (UI 미구현)", action)
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action, idx) => {
        const Icon = action.type === "edit_field" ? Pencil : action.type === "navigate" ? ArrowRight : FileText
        return (
          <button
            key={`${action.type}-${idx}`}
            type="button"
            onClick={() => handleClick(action)}
            className="group inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:border-sky-400 hover:bg-sky-100 hover:text-sky-900"
            title={summaryText(action)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{action.button_label || action.label}</span>
            <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100" />
          </button>
        )
      })}
    </div>
  )
}

function summaryText(action: ChatbotDraftAction): string {
  if (action.type === "edit_field") {
    const payload = action.payload as ChatbotEditFieldPayload
    return payload.summary ?? `${payload.entity_id} 수정`
  }
  if (action.type === "navigate") {
    const payload = action.payload as ChatbotNavigatePayload
    return payload.summary ?? `${payload.href} 로 이동`
  }
  return action.label
}

function appendPrefillParams(
  route: string,
  updates: Record<string, unknown>,
): string {
  if (!updates || Object.keys(updates).length === 0) {
    return route
  }
  // route 이미 query 가 있을 수 있음 (예: ?tab=opportunities)
  const [pathPart, queryPart = ""] = route.split("?")
  const params = new URLSearchParams(queryPart)
  for (const [field, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue
    const text = typeof value === "string" ? value : JSON.stringify(value)
    // chatbotPrefill_ prefix 로 각 폼이 식별
    params.set(`chatbotPrefill_${field}`, text)
  }
  return `${pathPart}?${params.toString()}`
}
