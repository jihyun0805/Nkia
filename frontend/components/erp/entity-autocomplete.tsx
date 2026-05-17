"use client"

import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import {
  getEntitySuggestions,
  type EntitySuggestion,
  type EntitySuggestionTarget,
} from "@/lib/entity-suggestions-api"
import { fuzzyMatch } from "@/lib/fuzzy-match"
import { cn } from "@/lib/utils"

type EntityAutocompleteProps = {
  value: string
  target: EntitySuggestionTarget
  onValueChange: (value: string) => void
  onSelect?: (suggestion: EntitySuggestion | null) => void
  placeholder?: string
  disabled?: boolean
  allowCustomValue?: boolean
  emptyMessage?: string
  filterSuggestion?: (suggestion: EntitySuggestion) => boolean
  /** BE 결과가 비거나 부족할 때 함께 검색할 로컬 후보. 한영/유사 매칭 강화용. */
  localCandidates?: EntitySuggestion[]
}

export function EntityAutocomplete({
  value,
  target,
  onValueChange,
  onSelect,
  placeholder = "검색어를 입력하세요",
  disabled = false,
  allowCustomValue = false,
  emptyMessage = "추천 결과가 없습니다.",
  filterSuggestion,
  localCandidates,
}: EntityAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || disabled) {
      setSuggestions([])
      return
    }

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      getEntitySuggestions({
        query: trimmedQuery,
        target,
        limit: 8,
        signal: abortController.signal,
      })
        .then(setSuggestions)
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          setSuggestions([])
        })
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [disabled, query, target])

  const mergedSuggestions = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed || !localCandidates || localCandidates.length === 0) {
      return suggestions
    }
    const fuzzyHits = fuzzyMatch(
      trimmed,
      localCandidates,
      (s) => [s.label, s.code ?? "", s.subtitle ?? ""],
      8,
    )
    if (fuzzyHits.length === 0) return suggestions
    const seen = new Set(suggestions.map((s) => `${s.type}-${s.id}`))
    const extras = fuzzyHits
      .map((h) => h.item)
      .filter((s) => !seen.has(`${s.type}-${s.id}`))
    return [...suggestions, ...extras]
  }, [suggestions, localCandidates, query])

  const filteredSuggestions = useMemo(
    () => (filterSuggestion ? mergedSuggestions.filter(filterSuggestion) : mergedSuggestions),
    [filterSuggestion, mergedSuggestions],
  )

  const commitSelection = (suggestion: EntitySuggestion | null) => {
    onValueChange(suggestion?.label ?? "")
    onSelect?.(suggestion)
    setQuery(suggestion?.label ?? "")
    setOpen(false)
  }

  const commitCustomValue = () => {
    onValueChange(query)
    onSelect?.(null)
    setOpen(false)
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextValue = event.target.value
            setQuery(nextValue)
            onValueChange(nextValue)
            onSelect?.(null)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            if (filteredSuggestions.length > 0) {
              commitSelection(filteredSuggestions[0])
              return
            }
            if (allowCustomValue) {
              commitCustomValue()
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (allowCustomValue) {
                commitCustomValue()
                return
              }
              setQuery(value)
              setOpen(false)
            }, 100)
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={`${suggestion.type}-${suggestion.id}`}
                  value={`${suggestion.type}-${suggestion.id}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onSelect={() => commitSelection(suggestion)}
                >
                  <Check className={cn("size-4", value === suggestion.label ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate">{suggestion.label}</p>
                      {suggestion.subtitle ? (
                        <p className="truncate text-xs text-muted-foreground">{suggestion.subtitle}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{suggestion.code || suggestion.id}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
