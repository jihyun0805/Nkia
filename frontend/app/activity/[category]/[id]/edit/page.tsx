"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ActivityFormFields } from "@/components/erp/activity-form-fields"
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  type ActivityCategory,
  type ActivityRecord,
  activities,
  activityRequestTypeOptions,
  getCategoryLabel,
  quotations,
  type ActivityRequestRecord,
} from "@/lib/activity-data"
import { toast } from "@/hooks/use-toast"
import {
  getActivityRequests,
  subscribeWorkflowUpdates,
  updateActivityRequest,
} from "@/lib/activity-request-workflow"
import { getPresalesUsers } from "@/lib/admin-data"
import { currentUser } from "@/lib/current-user"
import { type CustomerRecord, getCustomerByCode, getCustomerByName, getOpportunitiesByCustomerName } from "@/lib/finding-data"

const fullWidthFieldLabels = ["요청 내용"]

export default function ActivityEditPage() {
  const params = useParams<{ category: ActivityCategory; id: string }>()
  const router = useRouter()
  const category = params.category
  const id = params.id
  const presalesUsers = getPresalesUsers()
  const [requests, setRequests] = useState<ActivityRequestRecord[]>([])
  const [activityCustomer, setActivityCustomer] = useState("")
  const [activityCustomerCode, setActivityCustomerCode] = useState("")
  const [activityOpportunity, setActivityOpportunity] = useState("")
  const [activityOpportunityCode, setActivityOpportunityCode] = useState("")
  const [requestForm, setRequestForm] = useState({
    date: "",
    type: "",
    requester: "",
    receiver: "",
    customerCode: "",
    customer: "",
    opportunityCode: "",
    opportunity: "",
    dueDate: "",
    content: "",
  })

  useEffect(() => {
    const sync = () => setRequests(getActivityRequests())

    sync()
    return subscribeWorkflowUpdates(sync)
  }, [])

  const item = useMemo(() => {
    if (category === "activities") return activities.find((entry) => entry.id === id) ?? null
    if (category === "quotations") return quotations.find((entry) => entry.id === id) ?? null
    return requests.find((entry) => entry.id === id) ?? null
  }, [category, id, requests])

  useEffect(() => {
    if (category !== "activities" || !item) return

    const activity = item as ActivityRecord
    const normalizedCustomer =
      (activity.customerCode ? getCustomerByCode(activity.customerCode) : null) ??
      getCustomerByName(activity.customer)

    setActivityCustomer(normalizedCustomer?.name ?? activity.customer)
    setActivityCustomerCode(normalizedCustomer?.id ?? activity.customerCode ?? "")
    setActivityOpportunity(activity.opportunity ?? "")
    setActivityOpportunityCode(activity.businessCode ?? "")
  }, [category, item])

  useEffect(() => {
    if (category !== "requests" || !item) return

    const request = item as ActivityRequestRecord
    const normalizedCustomer =
      (request.customerCode ? getCustomerByCode(request.customerCode) : null) ??
      getCustomerByName(request.customer)
    setRequestForm({
      date: request.date,
      type: request.type,
      requester: request.requester,
      receiver: request.receiver,
      customerCode: normalizedCustomer?.id ?? request.customerCode ?? "",
      customer: normalizedCustomer?.name ?? request.customer,
      opportunityCode: request.opportunityCode ?? "",
      opportunity: request.opportunity,
      dueDate: request.dueDate,
      content: request.content,
    })
  }, [category, item])

  if (!item) {
    return null
  }

  const categoryLabel = getCategoryLabel(category)
  const requestItem = category === "requests" ? (item as ActivityRequestRecord) : null
  const canEditRequest = !requestItem || requestItem.requester === currentUser.name
  const matchedCustomer = category === "requests" ? getCustomerByName(requestForm.customer) : null
  const opportunityOptions = category === "requests" ? getOpportunitiesByCustomerName(requestForm.customer) : []
  const activityOpportunityOptions = getOpportunitiesByCustomerName(activityCustomer)

  const handleActivityCustomerSelect = (customer: CustomerRecord | null) => {
    setActivityCustomer(customer?.name ?? "")
    setActivityCustomerCode(customer?.id ?? "")
    setActivityOpportunity(customer ? "미확인" : "")
    setActivityOpportunityCode("")
  }

  const handleActivityOpportunityChange = (value: string) => {
    const opportunity = activityOpportunityOptions.find((item) => item.name === value)
    setActivityOpportunity(value)
    setActivityOpportunityCode(value === "미확인" ? "" : opportunity?.id ?? "")
  }

  const handleSubmit = () => {
    if (category !== "requests") {
      router.push(`/activity/${category}/${id}`)
      return
    }

    if (!canEditRequest) return

    const updated = updateActivityRequest(id, requestForm)
    if (!updated) return

    const updatedRequest = updated as ActivityRequestRecord

    toast({
      title: "활동 요청 수정 완료",
      description: `${updatedRequest.receiver} 담당자에게 수정 알림을 전송했습니다.`,
    })
    router.push(`/activity/${category}/${id}`)
  }

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
                {!canEditRequest && category === "requests" ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    본인이 요청한 활동 요청만 수정할 수 있습니다.
                  </div>
                ) : category === "activities" ? (
                  <>
                    <ActivityFormFields
                      defaultValues={item as ActivityRecord}
                      customerValue={activityCustomer}
                      customerCodeValue={activityCustomerCode}
                      onCustomerSelect={handleActivityCustomerSelect}
                      opportunityValue={activityOpportunity}
                      opportunityCodeValue={activityOpportunity === "미확인" ? "-" : activityOpportunityCode || "-"}
                      opportunityOptions={activityOpportunityOptions}
                      onOpportunityChange={handleActivityOpportunityChange}
                    />
                    <div className="space-y-2">
                      <Label>첨부파일</Label>
                      <Input type="file" multiple />
                    </div>
                  </>
                ) : category === "requests" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: "요청일", key: "date", type: "date" },
                      { label: "요청 유형", key: "type" },
                      { label: "요청자", key: "requester" },
                      { label: "담당자", key: "receiver" },
                      { label: "고객사", key: "customer" },
                      { label: "고객사 코드", key: "customerCode" },
                      { label: "사업기회", key: "opportunity" },
                      { label: "사업기회 코드", key: "opportunityCode" },
                      { label: "활동일", key: "dueDate", type: "date" },
                      { label: "요청 내용", key: "content" },
                    ].map((field) => (
                      <div
                        key={field.key}
                        className={`space-y-2 ${fullWidthFieldLabels.includes(field.label) ? "md:col-span-2" : ""}`}
                      >
                        <Label>{field.label}</Label>
                        {field.key === "content" ? (
                          <Textarea
                            rows={4}
                            value={requestForm.content}
                            onChange={(event) => setRequestForm((prev) => ({ ...prev, content: event.target.value }))}
                          />
                        ) : field.key === "type" ? (
                          <Select value={requestForm.type} onValueChange={(value) => setRequestForm((prev) => ({ ...prev, type: value }))}>
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
                        ) : field.key === "requester" ? (
                          <Input value={requestForm.requester} readOnly />
                        ) : field.key === "receiver" ? (
                          <Select value={requestForm.receiver} onValueChange={(value) => setRequestForm((prev) => ({ ...prev, receiver: value }))}>
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
                        ) : field.key === "customerCode" ? (
                          <Input value={matchedCustomer?.id ?? "-"} readOnly />
                        ) : field.key === "customer" ? (
                          <CustomerAutocomplete
                            value={requestForm.customer}
                            onSelect={(customer) => {
                              setRequestForm((prev) => ({
                                ...prev,
                                customer: customer?.name ?? "",
                                customerCode: customer?.id ?? "",
                                opportunity: customer ? "미확인" : "",
                                opportunityCode: "",
                              }))
                            }}
                          />
                        ) : field.key === "opportunityCode" ? (
                          <Input value={requestForm.opportunity === "미확인" ? "-" : requestForm.opportunityCode || "-"} readOnly />
                        ) : field.key === "opportunity" ? (
                          <Select
                            value={requestForm.opportunity}
                            onValueChange={(value) => {
                              const opportunity = opportunityOptions.find((item) => item.name === value)
                              setRequestForm((prev) => ({
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
                        ) : (
                          <Input
                            type={field.type === "date" ? "date" : "text"}
                            value={requestForm[field.key as keyof typeof requestForm]}
                            onChange={(event) =>
                              setRequestForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                            }
                          />
                        )}
                      </div>
                    ))}
                    <div className="space-y-2 md:col-span-2">
                      <Label>첨부파일</Label>
                      <Input type="file" multiple />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>작성일</Label>
                      <Input defaultValue={(item as { date: string }).date} />
                    </div>
                    <div className="space-y-2">
                      <Label>고객사</Label>
                      <Input defaultValue={(item as { customer: string }).customer} />
                    </div>
                    <div className="space-y-2">
                      <Label>사업기회</Label>
                      <Input defaultValue={(item as { opportunity: string }).opportunity} />
                    </div>
                    <div className="space-y-2">
                      <Label>제품</Label>
                      <Input defaultValue={(item as { product: string }).product} />
                    </div>
                    <div className="space-y-2">
                      <Label>금액</Label>
                      <Input defaultValue={(item as { amount: string }).amount} />
                    </div>
                    <div className="space-y-2">
                      <Label>유효기간</Label>
                      <Input type="date" defaultValue={(item as { validity: string }).validity} />
                    </div>
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
                  {canEditRequest && (
                    <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                      수정
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
