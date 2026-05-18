"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { ProductModulePicker } from "@/components/erp/product-module-picker"

type ProductModuleMultiPickerProps = {
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
  productClassFilter?: string
}

export function ProductModuleMultiPicker({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  emptyMessage,
  productClassFilter,
}: ProductModuleMultiPickerProps) {
  const [draft, setDraft] = useState("")

  useEffect(() => {
    setDraft("")
  }, [productClassFilter])

  const normalizedValue = useMemo(
    () => value.map((item) => item.trim()).filter(Boolean),
    [value],
  )

  const addModuleDirect = (moduleName: string) => {
    const next = moduleName.trim()
    if (!next) return
    if (normalizedValue.includes(next)) {
      setDraft("")
      return
    }
    onValueChange([...normalizedValue, next])
    setDraft("")
  }

  const removeModule = (target: string) => {
    onValueChange(normalizedValue.filter((item) => item !== target))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <ProductModulePicker
            value={draft}
            onValueChange={setDraft}
            onSelect={addModuleDirect}
            placeholder={placeholder}
            disabled={disabled}
            emptyMessage={emptyMessage}
            productClassFilter={productClassFilter}
          />
        </div>
      </div>
      {normalizedValue.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-md border bg-muted/20 p-3">
          {normalizedValue.map((module) => (
            <div key={module} className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm">
              <span className="truncate">{module}</span>
              <button
                type="button"
                onClick={() => removeModule(module)}
                className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`${module} 삭제`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
