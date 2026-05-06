"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
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
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import { QuotationSheet, createEmptyQuotationForm, normalizeQuotationForm, type QuotationFormState } from "@/components/erp/quotation-sheet"
import { activityRequestTypeOptions, type ActivityCategory, type ActivityRequestRecord, getCategoryLabel } from "@/lib/activity-data"
import { createActivityRequest, getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import { currentUser } from "@/lib/current-user"
import { getPresalesUsers } from "@/lib/admin-data"
import {
  type CustomerRecord,
  getCustomerByCode,
  getCustomerByName,
  getOpportunitiesByCustomerName,
  hasRegisteredCustomer,
} from "@/lib/finding-data"
import { toast } from "@/hooks/use-toast"
import { createQuotation } from "@/lib/quotation-workflow"
import { X } from "lucide-react"

const categories: ActivityCategory[] = ["activities", "quotations", "requests"]

function ActivityCategoryNewPageContent() {
  const params = useParams<{ category: ActivityCategory }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = params.category
  const presalesUsers = getPresalesUsers()
  const linkedRequestId = searchParams.get("requestId") ?? ""
  const [activityCustomer, setActivityCustomer] = useState("")
  const [activityCustomerCode, setActivityCustomerCode] = useState("")
  const [activityOpportunity, setActivityOpportunity] = useState("")
  const [activityOpportunityCode, setActivityOpportunityCode] = useState("")
  const [activityRequester, setActivityRequester] = useState("")
  const [linkedRequest, setLinkedRequest] = useState<ActivityRequestRecord | null>(null)
  const [quotationForm, setQuotationForm] = useState<QuotationFormState>(createEmptyQuotationForm())
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

  useEffect(() => {
    if (category !== "quotations") return

    const sync = () => {
      if (!linkedRequestId) return

      const request = getActivityRequests().find((item) => item.id === linkedRequestId) ?? null
      if (!request) return

      const matchedCustomer =
        (request.customerCode ? getCustomerByCode(request.customerCode) : null) ??
        (request.customer ? getCustomerByName(request.customer) : null)

      setQuotationForm((prev) =>
        normalizeQuotationForm({
          ...prev,
          requestId: request.id,
          customer: matchedCustomer?.name ?? request.customer ?? prev.customer,
          customerCode: matchedCustomer?.id ?? request.customerCode ?? prev.customerCode,
          opportunity: request.opportunity ?? prev.opportunity,
          opportunityCode: request.opportunityCode ?? prev.opportunityCode,
          proposalType: request.type === "SI 제안서 작성" ? "SI 제안" : "자체 제안",
          salesRep: request.requester ?? prev.salesRep,
          validity: request.dueDate || prev.validity,
        }),
      )
    }

    sync()
    return subscribeWorkflowUpdates(sync)
  }, [category, linkedRequestId])

  useEffect(() => {
    if (category !== "activities") return

    const sync = () => {
      if (!linkedRequestId) {
        setLinkedRequest(null)
        setActivityCustomerCode("")
        setActivityOpportunity("")
        setActivityOpportunityCode("")
        setActivityRequester("")
        return
      }

      const request = getActivityRequests().find((item) => item.id === linkedRequestId) ?? null
      const normalizedCustomer =
        (request?.customerCode ? getCustomerByCode(request.customerCode) : null) ??
        (request?.customer ? getCustomerByName(request.customer) : null)
      setLinkedRequest(request)
      setActivityRequester(request?.requester ?? "")
      if (request?.customer) {
        setActivityCustomer(normalizedCustomer?.name ?? request.customer)
      }
      setActivityCustomerCode(normalizedCustomer?.id ?? request?.customerCode ?? "")
      setActivityOpportunity(request?.opportunity ?? "")
      setActivityOpportunityCode(request?.opportunityCode ?? "")
    }

    sync()
    return subscribeWorkflowUpdates(sync)
  }, [category, linkedRequestId])

  if (!categories.includes(category)) {
    return null
  }

  const title = getCategoryLabel(category)
  const isProposalRequest =
    category === "quotations" &&
    !!linkedRequestId &&
    ["제안서 작성", "SI 제안서 작성"].includes(linkedRequest?.type ?? getActivityRequests().find((item) => item.id === linkedRequestId)?.type ?? "")
  const registrationTitle = category === "activities" ? "활동" : category === "quotations" && isProposalRequest ? "제안서" : title

  const targetCustomer =
    category === "activities" ? activityCustomer : category === "quotations" ? quotationForm.customer : form.customer
  const matchedCustomer = category === "requests" ? getCustomerByName(form.customer) : null
  const opportunityOptions = category === "requests" ? getOpportunitiesByCustomerName(form.customer) : []
  const activityOpportunityOptions = getOpportunitiesByCustomerName(activityCustomer)

  const ensureRegisteredCustomer = () => {
    if (hasRegisteredCustomer(targetCustomer)) return true

    setIsCustomerAlertOpen(true)
    return false
  }

  const handleSubmit = () => {
    if (!ensureRegisteredCustomer()) return

    if (category === "quotations") {
      const normalized = normalizeQuotationForm(quotationForm)
      const hasValidItem = normalized.items.some((item) => item.name && Number.parseInt(item.amount || "0", 10) > 0)

      if (!normalized.customer || !normalized.opportunity || !normalized.validity || !normalized.salesRep || !hasValidItem) {
        toast({
          title: "견적 필수값 확인",
          description: "고객사, 사업기회, 유효기간, 영업대표와 1개 이상의 제품 금액을 입력해주십시오.",
        })
        return
      }

      const created = createQuotation(normalized)
      toast({
        title: `${registrationTitle} 등록 완료`,
        description: `${created.customer} ${registrationTitle}가 등록되었습니다.`,
      })
      router.push(`/activity/quotations/${created.id}`)
      return
    }

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${registrationTitle} 등록`} description={`${registrationTitle} 정보를 등록합니다`} />
        <main className="flex-1 overflow-auto p-6">
          <div className={`mx-auto space-y-6 ${category === "quotations" ? "max-w-[1440px]" : "max-w-5xl"}`}>
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
                  <ActivityFormFields
                    defaultValues={{
                      registrant: currentUser.name,
                      requester: linkedRequest?.requester ?? "",
                      requestId: linkedRequest?.id ?? linkedRequestId,
                      activityContent: linkedRequest?.type ?? "",
                      opportunity: linkedRequest?.opportunity ?? "",
                    }}
                    customerValue={activityCustomer}
                    customerCodeValue={activityCustomerCode}
                    onCustomerSelect={handleActivityCustomerSelect}
                    onUnregisteredCustomerAttempt={() => setIsCustomerAlertOpen(true)}
                    opportunityValue={activityOpportunity}
                    opportunityCodeValue={activityOpportunity === "미확인" ? "-" : activityOpportunityCode || "-"}
                    opportunityOptions={activityOpportunityOptions}
                    onOpportunityChange={handleActivityOpportunityChange}
                    requesterValue={activityRequester}
                    onRequesterChange={setActivityRequester}
                    requestIdValue={linkedRequest?.id ?? linkedRequestId}
                  />
                )}

                {category === "quotations" && (
                  <QuotationSheet mode="create" form={quotationForm} onChange={setQuotationForm} />
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
                        <CustomerAutocomplete
                          value={form.customer}
                          onSelect={(customer) => {
                            setForm((prev) => ({
                              ...prev,
                              customer: customer?.name ?? "",
                              customerCode: customer?.id ?? "",
                              opportunity: customer ? "미확인" : "",
                              opportunityCode: "",
                            }))
                          }}
                          placeholder="고객사를 입력하세요"
                          onUnregisteredAttempt={() => setIsCustomerAlertOpen(true)}
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

                {category !== "quotations" && (
                  <div className="space-y-2">
                    <Label>첨부파일</Label>
                    <Input type="file" multiple />
                  </div>
                )}

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

export default function ActivityCategoryNewPage() {
  return (
    <Suspense fallback={null}>
      <ActivityCategoryNewPageContent />
    </Suspense>
  )
}
