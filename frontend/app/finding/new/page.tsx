import Link from "next/link"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { findingFormSections, type FindingFormField } from "@/lib/finding-data"

function FindingFormControl({ field }: { field: FindingFormField }) {
  if (field.type === "file") return <Input type="file" multiple />
  if (field.type === "textarea") return <Textarea rows={4} placeholder={`${field.label}을 입력하세요`} />
  if (field.type === "select") {
    return (
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return <Input placeholder={`${field.label}을 입력하세요`} />
}

export default function FindingNewPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="발굴 등록" description="신규 사업기회 등록정보를 하나의 양식으로 등록합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/finding">발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>등록</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>발굴 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {findingFormSections.map((section) => (
                  <section key={section.title} className="space-y-4">
                    <h2 className="text-base font-semibold">{section.title}</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <div key={field.label} className={field.type === "textarea" || field.type === "file" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                          <Label>
                            {field.label}
                            {field.required ? " *" : ""}
                          </Label>
                          <FindingFormControl field={field} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/finding">취소</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/finding">등록</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
