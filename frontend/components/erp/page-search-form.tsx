"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PageSearchFormProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
}

export function PageSearchForm({ value, onChange, onSearch }: PageSearchFormProps) {
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch()
      }}
    >
      <Input
        placeholder="검색어 입력"
        className="w-64"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button type="submit" variant="outline" size="sm" className="gap-2">
        <Search className="h-4 w-4" />
        검색
      </Button>
    </form>
  )
}
