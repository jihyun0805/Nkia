"use client"

import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { fuzzyMatch } from "@/lib/fuzzy-match"
import type { BackendUserSummary } from "@/lib/workflow-backend"
import { cn } from "@/lib/utils"

const POSITION_LABEL: Record<string, string> = {
  TEAM_MEMBER: "팀원",
  TEAM_LEADER: "팀장",
  HEAD_DIRECTOR: "본부장",
}

type UserPickerProps = {
  value: string
  users: BackendUserSummary[]
  onSelect: (user: BackendUserSummary | null) => void
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
}

export function UserPicker({
  value,
  users,
  onSelect,
  onValueChange,
  placeholder = "이름을 입력해 사용자를 선택하세요",
  disabled = false,
  emptyMessage = "일치하는 사용자가 없습니다.",
}: UserPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const suggestions = useMemo(() => {
    if (!users || users.length === 0) return []
    const trimmed = query.trim()
    if (!trimmed) return users.slice(0, 8)
    const hits = fuzzyMatch(
      trimmed,
      users,
      (u) => [u.name ?? "", u.employeeNumber ?? "", u.email ?? ""],
      8,
    )
    return hits.map((h) => h.item)
  }, [users, query])

  const commitSelection = (user: BackendUserSummary | null) => {
    const label = user?.name ?? ""
    onSelect(user)
    onValueChange?.(label)
    setQuery(label)
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
            const next = event.target.value
            setQuery(next)
            onValueChange?.(next)
            setOpen(true)
            // 입력 변경 시 정확한 사용자 매칭이 깨지므로 선택 해제
            if (next.trim() !== (value ?? "").trim()) {
              onSelect(null)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              if (suggestions.length > 0) commitSelection(suggestions[0])
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 100)
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
              {suggestions.map((user) => {
                const subtitle = [user.position ? POSITION_LABEL[user.position] ?? user.position : null, user.employeeNumber, user.email]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <CommandItem
                    key={user.id ?? user.email ?? user.name}
                    value={user.id ?? user.name ?? ""}
                    onMouseDown={(event) => event.preventDefault()}
                    onSelect={() => commitSelection(user)}
                  >
                    <Check className={cn("size-4", value === user.name ? "opacity-100" : "opacity-0")} />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate">{user.name}</p>
                        {subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                        ) : null}
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
