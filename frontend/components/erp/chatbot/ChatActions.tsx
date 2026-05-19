"use client"

import { Pencil, FileText, ArrowRight, ClipboardEdit } from "lucide-react"
import { useRouter } from "next/navigation"
import type {
  ChatbotDraftAction,
  ChatbotDraftPayload,
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
    if (action.type === "create_draft") {
      const payload = action.payload as ChatbotDraftPayload
      const route = buildDraftCreateRoute(action.document_type, payload)
      if (!route) {
        if (typeof window !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn("[ChatActions] create_draft 지원 안 되는 도메인", action.document_type)
        }
        return
      }
      router.push(route)
      return
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action, idx) => {
        const Icon =
          action.type === "edit_field"
            ? Pencil
            : action.type === "create_draft"
              ? ClipboardEdit
              : action.type === "navigate"
                ? ArrowRight
                : FileText
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
    const base = payload.summary ?? `${payload.entity_id} 수정`
    return `${base} (폼이 자동 채워집니다 — 확인 후 [저장] 버튼을 직접 눌러야 반영됩니다)`
  }
  if (action.type === "navigate") {
    const payload = action.payload as ChatbotNavigatePayload
    return payload.summary ?? `${payload.href} 로 이동`
  }
  if (action.type === "create_draft") {
    const payload = action.payload as ChatbotDraftPayload
    return payload.summary ?? `${action.label} 초안 작성`
  }
  // unreachable — exhaustive
  return ""
}

// document_type → 폼 등록 페이지 경로 매핑.
// 챗봇이 채운 슬롯(payload.slots)을 chatbotPrefill_<slot> query param 으로 전달.
const DRAFT_DOCUMENT_ROUTES: Record<string, string> = {
  prb_report: "/bid/new/prb?tab=prb",
  prb_result: "/bid/new/prb-result?tab=prb-result",
  rfp_analysis: "/bid/new/rfp?tab=rfp",
  proposal: "/bid/new/proposal?tab=proposal",
  bid_result: "/bid/new/result?tab=result",
  quotation: "/activity/new/quotations?tab=quotations",
  sales_activity: "/activity/new/activities?tab=activities",
  project_result_report: "/project?tab=results",
}

function buildDraftCreateRoute(
  documentType: string,
  payload: ChatbotDraftPayload,
): string | null {
  const baseRoute = DRAFT_DOCUMENT_ROUTES[documentType]
  if (!baseRoute) return null
  const slots = payload.slots ?? {}
  return appendPrefillParams(baseRoute, slots as Record<string, unknown>)
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
