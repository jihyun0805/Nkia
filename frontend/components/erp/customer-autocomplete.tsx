"use client"

import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { type CustomerRecord, getCustomerByName, normalizeCustomerKeyword, searchCustomers } from "@/lib/finding-data"

type CustomerAutocompleteProps = {
  value: string
  onSelect: (customer: CustomerRecord | null) => void
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onUnregisteredAttempt?: () => void
  allowCustomValue?: boolean
  inputClassName?: string
}

export function CustomerAutocomplete({
  value,
  onSelect,
  onValueChange,
  placeholder = "고객사를 선택하세요",
  disabled = false,
  onUnregisteredAttempt,
  allowCustomValue = false,
  inputClassName,
}: CustomerAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const suggestions = useMemo(() => searchCustomers(query).slice(0, 8), [query])

  const commitSelection = (customer: CustomerRecord | null) => {
    onSelect(customer)
    onValueChange?.(customer?.name ?? "")
    setQuery(customer?.name ?? "")
    setOpen(false)
  }

  const handleEnter = () => {
    if (suggestions.length > 0) {
      commitSelection(suggestions[0])
      return
    }

    const exactMatch = getCustomerByName(query)
    if (!exactMatch && normalizeCustomerKeyword(query) && !allowCustomValue) {
      onUnregisteredAttempt?.()
    }
    if (exactMatch) {
      commitSelection(exactMatch)
      return
    }

    if (allowCustomValue) {
      setOpen(false)
      return
    }

    commitSelection(null)
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClassName}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextValue = event.target.value
            setQuery(nextValue)
            onValueChange?.(nextValue)
            setOpen(true)
            if (!allowCustomValue && normalizeCustomerKeyword(event.target.value) !== normalizeCustomerKeyword(value)) {
              onSelect(null)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleEnter()
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              const exactMatch = getCustomerByName(query)
              if (!exactMatch && normalizeCustomerKeyword(query) && !allowCustomValue) {
                onUnregisteredAttempt?.()
              }
              if (exactMatch) {
                commitSelection(exactMatch)
                return
              }

              if (allowCustomValue) {
                setOpen(false)
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
            <CommandEmpty>등록된 고객사가 없습니다.</CommandEmpty>
            <CommandGroup>
              {suggestions.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onSelect={() => commitSelection(customer)}
                >
                  <Check className={cn("size-4", value === customer.name ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate">{customer.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{customer.id}</span>
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
