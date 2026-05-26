// 인수인계: 챗봇 액션이 sessionStorage에 넣은 prefill payload를 폼 페이지에서 읽고 소진하는 hook입니다.
// 핵심 흐름: navigate/edit/create_draft 액션이 페이지 이동 후 폼 값을 자동 채우도록 하는 프론트-챗봇 접점입니다.
// 같이 확인: 새 폼 자동채움 키를 추가하면 ChatActions.tsx의 저장 payload와 대상 폼의 sync hook을 같이 맞추세요.
"use client"

import { useEffect, useMemo } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

const PREFIX = "chatbotPrefill_"

/**
 * URL query 에서 chatbotPrefill_<field>=<value> 들을 추출.
 * 챗봇 edit_field action 으로 페이지가 열렸을 때 폼 prefill 용.
 *
 * 사용 예:
 *   const prefill = useChatbotPrefill()
 *   // prefill.values = { sales_representative_name: "김철수" }
 *   // 폼 useEffect 에서 setValue(field, value) 로 반영
 *
 *   // 처리 완료 후 URL 정리:
 *   prefill.clear()
 */
export type ChatbotPrefillState = {
  /** field 이름 → 값 매핑. 비어있으면 prefill 없음. */
  values: Record<string, string>
  /** prefill 값 존재 여부. */
  hasPrefill: boolean
  /** prefill query param 들을 URL 에서 제거. */
  clear: () => void
}

export function useChatbotPrefill(): ChatbotPrefillState {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const values = useMemo(() => {
    const result: Record<string, string> = {}
    if (!searchParams) return result
    searchParams.forEach((value, key) => {
      if (key.startsWith(PREFIX)) {
        result[key.slice(PREFIX.length)] = value
      }
    })
    return result
  }, [searchParams])

  const clear = () => {
    if (!searchParams) return
    const next = new URLSearchParams(searchParams.toString())
    const toRemove: string[] = []
    next.forEach((_, key) => {
      if (key.startsWith(PREFIX)) toRemove.push(key)
    })
    toRemove.forEach((key) => next.delete(key))
    const queryStr = next.toString()
    const url = queryStr ? `${pathname}?${queryStr}` : pathname
    router.replace(url, { scroll: false })
  }

  return {
    values,
    hasPrefill: Object.keys(values).length > 0,
    clear,
  }
}

/**
 * 사용 헬퍼: prefill 이 들어오면 자동으로 폼 필드에 setValue 호출.
 * react-hook-form 의 setValue 를 받아 처리.
 *
 * 사용 예:
 *   useChatbotPrefillSync(setValue)
 */
export function useChatbotPrefillSync(
  setValue: (field: string, value: string) => void,
  options: { clearAfter?: boolean } = { clearAfter: true },
) {
  const prefill = useChatbotPrefill()

  useEffect(() => {
    if (!prefill.hasPrefill) return
    for (const [field, value] of Object.entries(prefill.values)) {
      setValue(field, value)
    }
    if (options.clearAfter) {
      // URL 정리는 setValue 가 적용된 다음 turn 에 (race 방지)
      const id = window.setTimeout(() => prefill.clear(), 100)
      return () => window.clearTimeout(id)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill.hasPrefill])
}
