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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ActivityFormFields } from "@/components/erp/activity-form-fields"
import { activityRequestStatusOptions, activityRequestTypeOptions, type ActivityCategory, getCategoryLabel } from "@/lib/activity-data"

const categories: ActivityCategory[] = ["activities", "quotations", "requests"]

export default async function ActivityCategoryNewPage({ params }: { params: Promise<{ category: ActivityCategory }> }) {
  const { category } = await params
  if (!categories.includes(category)) notFound()

  const title = getCategoryLabel(category)
  const registrationTitle = category === "activities" ? "활동" : title

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${registrationTitle} 등록`} description={`${registrationTitle} 정보를 등록합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity">영업활동</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{registrationTitle} 등록</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{registrationTitle} 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {category === "activities" && (
                  <ActivityFormFields />
                )}

                {category === "quotations" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>견적일 *</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>고객사 *</Label>
                        <Input placeholder="고객사를 입력하세요" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>사업기회 *</Label>
                        <Input placeholder="사업기회를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label>제품 *</Label>
                        <Input placeholder="제품명을 입력하세요" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>견적 금액 *</Label>
                        <Input placeholder="금액을 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label>유효기간 *</Label>
                        <Input type="date" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>견적 비고</Label>
                      <Textarea rows={4} />
                    </div>
                  </>
                )}

                {category === "requests" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>요청일 *</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>요청 유형 *</Label>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                          <SelectContent>
                            {activityRequestTypeOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>요청자 *</Label>
                        <Input placeholder="요청자를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label>담당자 *</Label>
                        <Input placeholder="담당자를 입력하세요" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>고객사 *</Label>
                        <Input placeholder="고객사를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label>활동일 *</Label>
                        <Input type="date" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>상태 *</Label>
                        <Select defaultValue="요청">
                          <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                          <SelectContent>
                            {activityRequestStatusOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>요청 내용 *</Label>
                      <Textarea rows={4} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>첨부파일</Label>
                  <Input type="file" multiple />
                </div>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/activity">취소</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/activity">{registrationTitle} 등록</Link>
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
