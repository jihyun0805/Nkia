import Link from "next/link"
import { notFound } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { type ActivityCategory, getActivityItem, getActivityItemFields, getCategoryLabel } from "@/lib/activity-data"

type PageProps = {
  params: Promise<{
    category: ActivityCategory
    id: string
  }>
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { category, id } = await params
  const item = getActivityItem(category, id)

  if (!item) {
    notFound()
  }

  const categoryLabel = getCategoryLabel(category)
  const fields = getActivityItemFields(category, item)
  const fullWidthFieldLabels = ["주요 내용", "고객 관심 사항 / 이슈", "다음 할 일", "견적 비고", "요청 내용"]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header
          title={`${categoryLabel} 상세`}
          description={`${categoryLabel} 건을 페이지에서 확인합니다`}
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
                  <BreadcrumbPage>{item.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{categoryLabel} 상세</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map((field) => (
                    <div
                      key={field.label}
                      className={`space-y-2 ${fullWidthFieldLabels.includes(field.label) ? "md:col-span-2" : ""}`}
                    >
                      <Label>{field.label}</Label>
                      <Input readOnly value={field.value || "-"} />
                    </div>
                  ))}
                  <div className="space-y-2 md:col-span-2">
                    <Label>첨부파일</Label>
                    <Input readOnly value="등록된 첨부파일이 없습니다." />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/activity">목록</Link>
                  </Button>
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href={`/activity/${category}/${id}/edit`}>수정</Link>
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
