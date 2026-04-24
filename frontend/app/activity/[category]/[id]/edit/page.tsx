import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ActivityFormFields } from "@/components/erp/activity-form-fields"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  activityRequestTypeOptions,
  type ActivityRecord,
  type ActivityCategory,
  getActivityItem,
  getActivityItemFields,
  getCategoryLabel,
} from "@/lib/activity-data"
import { getStatusOptions, isStatusField } from "@/lib/status-options"

type PageProps = {
  params: Promise<{
    category: ActivityCategory
    id: string
  }>
}

export default async function ActivityEditPage({ params }: PageProps) {
  const { category, id } = await params
  const item = getActivityItem(category, id)

  if (!item) {
    notFound()
  }

  const categoryLabel = getCategoryLabel(category)
  const fields = getActivityItemFields(category, item)
  const fullWidthFieldLabels = ["주요 내용", "고객 관심 사항 / 이슈", "다음 할 일", "견적 비고", "요청 내용"]
  const dateFieldLabels = ["활동일", "견적일", "유효기간", "요청일"]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header
          title={`${categoryLabel} 수정`}
          description={`${categoryLabel} 정보를 페이지에서 수정합니다`}
        />

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity">활동</Link>
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
                <CardTitle>{categoryLabel} 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {category === "activities" ? (
                  <>
                    <ActivityFormFields defaultValues={item as ActivityRecord} />
                    <div className="space-y-2">
                      <Label>첨부파일</Label>
                      <Input type="file" multiple />
                    </div>
                  </>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {fields.map((field) => (
                      <div
                        key={field.label}
                        className={`space-y-2 ${fullWidthFieldLabels.includes(field.label) ? "md:col-span-2" : ""}`}
                      >
                        <Label>{field.label}</Label>
                        {fullWidthFieldLabels.includes(field.label) ? (
                          <Textarea defaultValue={field.value} rows={4} />
                        ) : category === "requests" && field.label === "요청 유형" ? (
                          <Select defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                            <SelectContent>
                              {activityRequestTypeOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : isStatusField(field.label) ? (
                          <Select defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                            <SelectContent>{getStatusOptions(field.value).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : dateFieldLabels.includes(field.label) ? (
                          <Input type="date" defaultValue={field.value} />
                        ) : (
                          <Input defaultValue={field.value} />
                        )}
                      </div>
                    ))}
                    <div className="space-y-2 md:col-span-2">
                      <Label>첨부파일</Label>
                      <Input type="file" multiple />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={`/activity/${category}/${id}`}>취소</Link>
                  </Button>
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href={`/activity/${category}/${id}`}>수정</Link>
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
