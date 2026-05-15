"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { fuzzyMatch } from "@/lib/fuzzy-match"
import type { BackendUserSummary } from "@/lib/workflow-backend"
import { cn } from "@/lib/utils"
import { formatUserDisplayName, formatUserSubtitle } from "@/lib/user-utils"

type UserIdPickerProps = {
  value: string
  users: BackendUserSummary[]
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
}

export function UserIdPicker({
  value,
  users,
  onValueChange,
  placeholder = "사용자를 선택하세요",
  disabled = false,
  emptyMessage = "일치하는 사용자가 없습니다.",
}: UserIdPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedUser = useMemo(() => users.find((user) => user.id === value) ?? null, [users, value])

  useEffect(() => {
    if (!open) {
      setQuery(selectedUser ? formatUserDisplayName(selectedUser) : "")
    }
  }, [open, selectedUser])

  const suggestions = useMemo(() => {
    if (!users || users.length === 0) return []
    const trimmed = query.trim()
    if (!trimmed) return users.slice(0, 8)
    const hits = fuzzyMatch(
      trimmed,
      users,
      (user) => [user.name ?? "", user.employeeNumber ?? "", user.email ?? "", user.id ?? ""],
      8,
    )
    return hits.map((hit) => hit.item)
  }, [users, query])

  const commitSelection = (user: BackendUserSummary | null) => {
    onValueChange(user?.id?.trim() ?? "")
    setQuery(user ? formatUserDisplayName(user) : "")
    setOpen(false)
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", selectedUser || value ? "text-foreground" : "text-muted-foreground")}>
            {selectedUser ? formatUserDisplayName(selectedUser) : value || placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-anchor-width)] p-0" align="start" onOpenAutoFocus={(event) => event.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="이름, 사번, 이메일, ID로 검색"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {suggestions.map((user) => {
                const subtitle = formatUserSubtitle(user)
                return (
                  <CommandItem
                    key={user.id ?? user.email ?? user.name}
                    value={user.id ?? user.name ?? ""}
                    onMouseDown={(event) => event.preventDefault()}
                    onSelect={() => commitSelection(user)}
                  >
                    <Check className={cn("size-4", value === user.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{formatUserDisplayName(user)}</p>
                      {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
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
