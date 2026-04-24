"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ActivityFormFields } from "@/components/erp/activity-form-fields"
import { activityRequestTypeOptions, type ActivityCategory, getCategoryLabel } from "@/lib/activity-data"
import { createActivityRequest } from "@/lib/activity-request-workflow"
import { currentUser } from "@/lib/current-user"
import { getPresalesUsers } from "@/lib/admin-data"
import { getCustomerByName, getOpportunitiesByCustomerName, hasRegisteredCustomer } from "@/lib/finding-data"
import { toast } from "@/hooks/use-toast"
import { X } from "lucide-react"

const categories: ActivityCategory[] = ["activities", "quotations", "requests"]

export default function ActivityCategoryNewPage() {
  const params = useParams<{ category: ActivityCategory }>()
  const router = useRouter()
  const category = params.category
  const presalesUsers = getPresalesUsers()
  const [activityCustomer, setActivityCustomer] = useState("")
  const [quotationCustomer, setQuotationCustomer] = useState("")
  const [isCustomerAlertOpen, setIsCustomerAlertOpen] = useState(false)
  const [form, setForm] = useState({
    date: "",
    type: "",
    requester: currentUser.name,
    receiver: presalesUsers[0]?.name ?? "",
    customerCode: "",
    customer: "",
    opportunityCode: "",
    opportunity: "",
    dueDate: "",
    content: "",
  })

  if (!categories.includes(category)) {
    return null
  }

  const title = getCategoryLabel(category)
  const registrationTitle = category === "activities" ? "활동" : title

  const targetCustomer =
    category === "activities" ? activityCustomer : category === "quotations" ? quotationCustomer : form.customer
  const matchedCustomer = category === "requests" ? getCustomerByName(form.customer) : null
  const opportunityOptions = category === "requests" ? getOpportunitiesByCustomerName(form.customer) : []

  const ensureRegisteredCustomer = () => {
    if (hasRegisteredCustomer(targetCustomer)) return true

    setIsCustomerAlertOpen(true)
    return false
  }

  const handleSubmit = () => {
    if (!ensureRegisteredCustomer()) return

    if (category !== "requests") {
      router.push("/activity")
      return
    }

    const created = createActivityRequest(form)
    toast({
      title: "활동 요청 등록 완료",
      description: `${created.receiver} 담당자에게 접수 확인 티켓을 전송했습니다.`,
    })
    router.push(`/activity/requests/${created.id}`)
  }

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
                  <ActivityFormFields customerValue={activityCustomer} onCustomerChange={setActivityCustomer} />
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
                        <Input value={quotationCustomer} onChange={(event) => setQuotationCustomer(event.target.value)} placeholder="고객사를 입력하세요" />
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
                        <Input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>요청 유형 *</Label>
                        <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="요청 유형을 선택하세요" />
                          </SelectTrigger>
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
                        <Input value={form.requester} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>담당자 *</Label>
                        <Select value={form.receiver} onValueChange={(value) => setForm((prev) => ({ ...prev, receiver: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="담당자를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {presalesUsers.map((user) => (
                              <SelectItem key={user.id} value={user.name}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>고객사 *</Label>
                        <Input
                          value={form.customer}
                          onChange={(event) => {
                            const nextCustomer = event.target.value
                            const customer = getCustomerByName(nextCustomer)

                            setForm((prev) => ({
                              ...prev,
                              customer: nextCustomer,
                              customerCode: customer?.id ?? "",
                              opportunity: customer ? "미확인" : "",
                              opportunityCode: "",
                            }))
                          }}
                          placeholder="고객사를 입력하세요"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>고객사 코드</Label>
                        <Input value={matchedCustomer?.id ?? "-"} readOnly />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>사업기회 *</Label>
                        <Select
                          value={form.opportunity}
                          onValueChange={(value) => {
                            const opportunity = opportunityOptions.find((item) => item.name === value)
                            setForm((prev) => ({
                              ...prev,
                              opportunity: value,
                              opportunityCode: opportunity?.id ?? "",
                            }))
                          }}
                          disabled={!matchedCustomer}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={matchedCustomer ? "사업기회를 선택하세요" : "고객사를 먼저 입력하세요"} />
                          </SelectTrigger>
                          <SelectContent>
                            {opportunityOptions.map((option) => (
                              <SelectItem key={option.id} value={option.name}>
                                {option.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="미확인">미확인</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>사업기회 코드</Label>
                        <Input value={form.opportunity === "미확인" ? "-" : form.opportunityCode || "-"} readOnly />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>활동일 *</Label>
                        <Input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>요청 내용 *</Label>
                      <Textarea rows={4} value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
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
                  <Button onClick={handleSubmit}>
                    {registrationTitle} 등록
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <AlertDialog open={isCustomerAlertOpen} onOpenChange={setIsCustomerAlertOpen}>
        <AlertDialogContent>
          <AlertDialogCancel className="absolute top-4 right-4 h-9 w-9 p-0">
            <X className="h-4 w-4" />
          </AlertDialogCancel>
          <AlertDialogHeader>
            <AlertDialogTitle>고객사 등록 필요</AlertDialogTitle>
            <AlertDialogDescription>
              등록된 고객사 정보가 없어서 활동을 등록할 수 없습니다. 먼저 고객사 등록 후 활동을 등록해주십시오.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Link href="/finding/new/customers">고객사 등록</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
