"use client"

import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { getEntitySuggestions, type EntitySuggestion } from "@/lib/entity-suggestions-api"
import { cn } from "@/lib/utils"
import { type CustomerRecord, getCustomerByName, normalizeCustomerKeyword, searchCustomers } from "@/lib/finding-data"
import { loadBackendFindingData } from "@/lib/finding-backend"

type CustomerAutocompleteProps = {
  value: string
  onSelect: (customer: CustomerRecord | null) => void
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onUnregisteredAttempt?: () => void
  allowCustomValue?: boolean
}

export function CustomerAutocomplete({
  value,
  onSelect,
  onValueChange,
  placeholder = "고객사를 선택하세요",
  disabled = false,
  onUnregisteredAttempt,
  allowCustomValue = false,
}: CustomerAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [dbSuggestions, setDbSuggestions] = useState<CustomerRecord[]>([])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setDbSuggestions([])
      return
    }

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      getEntitySuggestions({
        query: trimmedQuery,
        target: "customers",
        limit: 8,
        signal: abortController.signal,
      })
        .then((results) => {
          setDbSuggestions(results.filter((item) => item.type === "CUSTOMER").map(mapSuggestionToCustomer))
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          setDbSuggestions([])
        })
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [query])

  const localSuggestions = useMemo(() => searchCustomers(query).slice(0, 8), [query])
  const suggestions = dbSuggestions.length > 0 ? dbSuggestions : localSuggestions

  const commitSelection = (customer: CustomerRecord | null) => {
    onSelect(customer)
    onValueChange?.(customer?.name ?? "")
    setQuery(customer?.name ?? "")
    setOpen(false)
  }

  const resolveKnownCustomer = async () => {
    if (suggestions.length > 0) {
      return suggestions[0]
    }

    const exactMatch = findKnownCustomer(query, dbSuggestions)
    if (exactMatch) {
      return exactMatch
    }

    try {
      const backendData = await loadBackendFindingData()
      const normalizedQuery = normalizeCustomerKeyword(query)
      const backendMatch = backendData.customers.find((customer) => {
        if (normalizeCustomerKeyword(customer.name) === normalizedQuery) return true
        return customer.aliases?.some((alias) => normalizeCustomerKeyword(alias) === normalizedQuery) ?? false
      })
      return backendMatch ?? null
    } catch {
      return null
    }
  }

  const handleEnter = async () => {
    const exactMatch = await resolveKnownCustomer()
    if (exactMatch) {
      commitSelection(exactMatch)
      return
    }

    if (normalizeCustomerKeyword(query) && !allowCustomValue) {
      onUnregisteredAttempt?.()
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
              void handleEnter()
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              void (async () => {
                const exactMatch = await resolveKnownCustomer()
                if (exactMatch) {
                  commitSelection(exactMatch)
                  return
                }

                if (normalizeCustomerKeyword(query) && !allowCustomValue) {
                  onUnregisteredAttempt?.()
                }

                if (allowCustomValue) {
                  setOpen(false)
                  return
                }

                setQuery(value)
                setOpen(false)
              })()
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

function mapSuggestionToCustomer(suggestion: EntitySuggestion): CustomerRecord {
  return {
    id: suggestion.code || suggestion.id,
    name: suggestion.label,
    category: String(suggestion.metadata?.sector ?? ""),
    opportunities: 0,
    contracts: 0,
    contact: "",
    phone: "",
  }
}

function findKnownCustomer(query: string, dbSuggestions: CustomerRecord[]) {
  const normalizedQuery = normalizeCustomerKeyword(query)
  if (!normalizedQuery) return null

  return (
    getCustomerByName(query) ??
    dbSuggestions.find((customer) => normalizeCustomerKeyword(customer.name) === normalizedQuery) ??
    null
  )
}
