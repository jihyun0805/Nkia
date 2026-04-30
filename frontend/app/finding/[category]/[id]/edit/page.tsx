import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { findingFormSections, getFindingCategoryLabel, getFindingFormFieldValue, getFindingItem, type FindingCategory, type FindingFormField } from "@/lib/finding-data"

function FindingEditControl({ field, value }: { field: FindingFormField; value: string }) {
  if (field.type === "file") return <Input type="file" multiple />
  if (field.type === "textarea") return <Textarea rows={4} defaultValue={value} placeholder={`${field.label}을 입력하세요`} />
  if (field.type === "select") {
    return (
      <Select defaultValue={field.options?.includes(value) ? value : undefined}>
        <SelectTrigger>
          <SelectValue placeholder={value || "선택하세요"} />
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
  return <Input defaultValue={value} placeholder={`${field.label}을 입력하세요`} />
}

export default async function FindingEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: FindingCategory; id: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  const { category, id } = await params
  const { tab } = (await searchParams) ?? {}
  const item = getFindingItem(category, id)
  if (!item) notFound()
  const label = getFindingCategoryLabel(category)
  const backHref = `/finding?tab=${tab ?? category}`

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${label} 수정`} description="발굴 등록과 같은 양식으로 정보를 수정합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={backHref}>발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{label} 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {findingFormSections.map((section) => (
                  <section key={section.title} className="space-y-4">
                    <h2 className="text-base font-semibold">{section.title}</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) => {
                        const value = getFindingFormFieldValue(category, item, field.label)
                        return (
                          <div key={field.label} className={field.type === "textarea" || field.type === "file" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                            <Label>
                              {field.label}
                              {field.required ? " *" : ""}
                            </Label>
                            <FindingEditControl field={field} value={value} />
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={`/finding/${category}/${id}?tab=${tab ?? category}`}>취소</Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/finding/${category}/${id}?tab=${tab ?? category}`}>수정</Link>
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
