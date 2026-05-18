"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { adminApi, type ProductModuleResponse } from "@/lib/api/admin-api"
import { fuzzyMatch } from "@/lib/fuzzy-match"
import { cn } from "@/lib/utils"

type ProductModulePickerProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
  productClassFilter?: string
}

export function ProductModulePicker({
  value,
  onValueChange,
  placeholder = "제품명을 선택하세요",
  disabled = false,
  emptyMessage = "일치하는 제품명이 없습니다.",
  productClassFilter,
}: ProductModulePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<ProductModuleResponse[]>([])

  const selectedProduct = useMemo(
    () => products.find((product) => product.productName === value) ?? null,
    [products, value],
  )

  useEffect(() => {
    if (!open) {
      setQuery(selectedProduct ? selectedProduct.productName : value)
    }
  }, [open, selectedProduct, value])

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      try {
        const response = await adminApi.getProducts()
        if (cancelled) return
        setProducts(Array.isArray(response?.data) ? response.data : [])
      } catch {
        if (!cancelled) {
          setProducts([])
        }
      }
    }

    void sync()

    return () => {
      cancelled = true
    }
  }, [])

  const suggestions = useMemo(() => {
    const scopedProducts = productClassFilter?.trim()
      ? products.filter((product) => product.productClass === productClassFilter.trim())
      : products
    if (!scopedProducts || scopedProducts.length === 0) return []
    const trimmed = query.trim()
    if (!trimmed) return scopedProducts.slice(0, 10)
    return fuzzyMatch(
      trimmed,
      scopedProducts,
      (product) => [product.productName, product.productClass, product.productGroup],
      10,
    ).map((hit) => hit.item)
  }, [products, query, productClassFilter])

  const commitSelection = (product: ProductModuleResponse | null) => {
    onValueChange(product?.productName?.trim() ?? "")
    setQuery(product?.productName ?? "")
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
          <span className={cn("min-w-0 flex-1 truncate", selectedProduct || value ? "text-foreground" : "text-muted-foreground")}>
            {selectedProduct ? selectedProduct.productName : value || placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-anchor-width)] p-0" align="start" onOpenAutoFocus={(event) => event.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="제품명 검색"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {suggestions.map((product) => (
                <CommandItem
                  key={product.id}
                  value={String(product.id)}
                  onMouseDown={(event) => event.preventDefault()}
                  onSelect={() => commitSelection(product)}
                >
                  <Check className={cn("size-4", value === product.productName ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{product.productName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
