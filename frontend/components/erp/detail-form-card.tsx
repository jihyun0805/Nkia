import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type DetailField = {
  label: string
  value?: string | number | null
}

type DetailFormCardProps = {
  title: string
  fields: DetailField[]
  listHref: string
  editHref: string
  includeAttachment?: boolean
}

export function DetailFormCard({ title, fields, listHref, editHref, includeAttachment = false }: DetailFormCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="space-y-2">
              <Label>{field.label}</Label>
              <Input readOnly value={field.value ? String(field.value) : "-"} />
            </div>
          ))}
          {includeAttachment && (
            <div className="space-y-2 md:col-span-2">
              <Label>첨부파일</Label>
              <Input readOnly value="등록된 첨부파일이 없습니다." />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t pt-6">
          <Button variant="outline" asChild>
            <Link href={listHref}>목록</Link>
          </Button>
          <Button asChild>
            <Link href={editHref}>수정</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
