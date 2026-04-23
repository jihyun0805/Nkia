"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter } from "lucide-react"
import { defaultFilterValues, type FilterValues } from "@/lib/filter-utils"

type FilterFieldOption = {
  key: string
  label: string
  options: string[]
  placeholder?: string
}

interface FilterPopoverProps {
  title: string
  statusOptions: string[]
  value: FilterValues
  onApply: (value: FilterValues) => void
  ownerLabel?: string
  fieldOptions?: FilterFieldOption[]
  showStatusFilter?: boolean
}

export function FilterPopover({
  title,
  statusOptions,
  value,
  onApply,
  ownerLabel = "담당자",
  fieldOptions = [],
  showStatusFilter = true,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FilterValues>(value)

  const handleApply = () => {
    onApply(draft)
    setOpen(false)
  }

  const handleReset = () => {
    setDraft(defaultFilterValues)
    onApply(defaultFilterValues)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (nextOpen) setDraft(value)
    }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] max-w-[calc(100vw-2rem)] space-y-4">
        <div className="space-y-1">
          <h4 className="font-semibold">{title} 필터</h4>
          <p className="text-sm text-muted-foreground">조건을 선택해 조회 범위를 좁힙니다.</p>
        </div>
        {showStatusFilter && (
          <div className="space-y-2">
            <Label>상태</Label>
            <Select
              value={draft.status || "all"}
              onValueChange={(nextValue) =>
                setDraft((prev) => ({
                  ...prev,
                  status: nextValue === "all" ? "" : nextValue,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="전체 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>{ownerLabel}</Label>
          <Input
            placeholder={`${ownerLabel}명 입력`}
            value={draft.owner}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, owner: e.target.value }))
            }
          />
        </div>
        {fieldOptions.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {fieldOptions.map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label>{field.label}</Label>
                <Select
                  value={draft.fields?.[field.key] || "all"}
                  onValueChange={(nextValue) =>
                    setDraft((prev) => ({
                      ...prev,
                      fields: {
                        ...(prev.fields ?? {}),
                        [field.key]: nextValue === "all" ? "" : nextValue,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={field.placeholder ?? `전체 ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>시작일</Label>
            <Input
              type="date"
              value={draft.dateFrom}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>종료일</Label>
            <Input
              type="date"
              value={draft.dateTo}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, dateTo: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>초기화</Button>
          <Button size="sm" onClick={handleApply}>조회</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
