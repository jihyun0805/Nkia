"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fuzzyMatch } from "@/lib/fuzzy-match"

export type SimilarMatchCandidate = {
  id: string
  label: string
  subtitle?: string
  keywords?: string[]
}

type SimilarMatchHintProps = {
  query: string
  candidates: SimilarMatchCandidate[]
  /** 정확히 일치(exact) 매치까지 노출할지. 보통 신규 등록 폼에선 false (중복만 경고). */
  showOnExactMatch?: boolean
  limit?: number
  onPick?: (candidate: SimilarMatchCandidate) => void
  className?: string
  emptyTitle?: string
  hintTitle?: string
}

/**
 * 신규 등록 폼에서 사용자가 이름을 입력할 때 비슷한 기존 항목이 있는지 안내.
 * 예: 고객사 등록에서 "엘지" 입력 시 이미 등록된 "LG전자"를 노출.
 */
export function SimilarMatchHint({
  query,
  candidates,
  showOnExactMatch = false,
  limit = 5,
  onPick,
  className,
  hintTitle = "비슷한 항목이 이미 있어요",
}: SimilarMatchHintProps) {
  const hits = useMemo(() => {
    if (!query || query.trim().length < 2) return []
    return fuzzyMatch(
      query,
      candidates,
      (c) => [c.label, c.id, ...(c.keywords ?? [])],
      limit,
    )
  }, [query, candidates, limit])

  const visible = useMemo(() => {
    if (hits.length === 0) return []
    if (showOnExactMatch) return hits
    // 정확히 같은 라벨이면 사용자가 의도한 그 항목이므로 굳이 경고하지 않음
    return hits.filter((h) => h.kind !== "exact" || h.item.label !== query.trim())
  }, [hits, query, showOnExactMatch])

  if (visible.length === 0) return null

  return (
    <div className={`mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-2 text-amber-900">
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">{hintTitle}</span>
      </div>
      <ul className="space-y-1.5">
        {visible.map((hit) => (
          <li key={hit.item.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-amber-900">{hit.item.label}</p>
              {hit.item.subtitle && (
                <p className="truncate text-xs text-amber-800/70">{hit.item.subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="border-amber-300 bg-white text-xs text-amber-900">
                {labelForKind(hit.kind)}
              </Badge>
              {onPick && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-300 text-amber-900 hover:bg-amber-100"
                  onClick={() => onPick(hit.item)}
                >
                  사용
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function labelForKind(kind: ReturnType<typeof fuzzyMatch>[number]["kind"]) {
  switch (kind) {
    case "exact":
      return "정확히 일치"
    case "prefix":
      return "앞부분 일치"
    case "contains":
      return "포함됨"
    case "choseong":
      return "초성 일치"
    default:
      return "유사"
  }
}
