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
import { ActivityFormFields } from "@/components/erp/searchable-activity-form-fields"
import { CustomerAutocomplete } from "@/components/erp/entity-customer-autocomplete"
import { EntityAutocomplete } from "@/components/erp/entity-autocomplete"
import { QuotationSheet, createEmptyQuotationForm, normalizeQuotationForm, type QuotationFormState } from "@/components/erp/quotation-sheet"
import { formatAttachmentSize, readFileAsStoredAttachment, type StoredFileAttachment } from "@/lib/attachments"
import { activityRequestTypeOptions, type ActivityCategory, type ActivityRequestRecord, getCategoryLabel } from "@/lib/activity-data"
import { createActivityRequest, getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
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
import { createBackendActivityRecord } from "@/lib/sales-activity-backend"
import { createBackendActivityRequest, loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import { type EntitySuggestion } from "@/lib/entity-suggestions-api"
import { createBackendQuotationRecord } from "@/lib/sales-quotation-backend"

const categories: ActivityCategory[] = ["activities", "quotations", "requests"]
type AttachmentDraft = StoredFileAttachment

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
  const [activityAttachments, setActivityAttachments] = useState<AttachmentDraft[]>([])
  const [requestAttachments, setRequestAttachments] = useState<AttachmentDraft[]>([])
  const [quotationForm, setQuotationForm] = useState<QuotationFormState>(createEmptyQuotationForm())
  const [isCustomerAlertOpen, setIsCustomerAlertOpen] = useState(false)
  const [activityForm, setActivityForm] = useState({
    date: "",
    activityMode: "",
    activityContent: "",
    location: "",
    attendees: "",
    content: "",
    issues: "",
    nextAction: "",
  })
  const [form, setForm] = useState({
    date: "",
    type: "",
    requester: "",
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

    let cancelled = false

    const sync = (requests = getActivityRequests()) => {
      if (cancelled) return
      if (!linkedRequestId) return

      const request = requests.find((item) => item.id === linkedRequestId) ?? null
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

    loadBackendActivityRequests()
      .then((requests) => sync(requests))
      .catch(() => sync())

    const unsubscribe = subscribeWorkflowUpdates(() => sync())
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [category, linkedRequestId])

  useEffect(() => {
    if (category !== "activities") return

    let cancelled = false

    const sync = (requests = getActivityRequests()) => {
      if (cancelled) return

      if (!linkedRequestId) {
        setLinkedRequest(null)
        setActivityCustomerCode("")
        setActivityOpportunity("")
        setActivityOpportunityCode("")
        setActivityRequester("")
        return
      }

      const request = requests.find((item) => item.id === linkedRequestId) ?? null
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
      setActivityForm((prev) => ({
        ...prev,
        activityContent: request?.type ?? prev.activityContent,
      }))
    }

    loadBackendActivityRequests()
      .then((requests) => sync(requests))
      .catch(() => sync())

    const unsubscribe = subscribeWorkflowUpdates(() => sync())
    return () => {
      cancelled = true
      unsubscribe()
    }
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
  const currentAttachments = category === "activities" ? activityAttachments : requestAttachments

  const ensureRegisteredCustomer = () => {
    if (hasRegisteredCustomer(targetCustomer)) return true

    setIsCustomerAlertOpen(true)
    return false
  }

  const handleAttachmentChange = async (
    files: FileList | null | undefined,
    onComplete: (updater: (prev: AttachmentDraft[]) => AttachmentDraft[]) => void,
  ) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return

    try {
      const nextAttachments = await Promise.all(selectedFiles.map((file) => readFileAsStoredAttachment(file)))
      onComplete((prev) => [...prev, ...nextAttachments])
    } catch (error) {
      toast({
        title: "첨부파일 등록 실패",
        description: error instanceof Error ? error.message : "첨부파일을 다시 확인해주십시오.",
      })
    }
  }

  const handleSubmit = async () => {
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

      try {
        const created = await createBackendQuotationRecord(normalized)
        toast({
          title: `${registrationTitle} 등록 완료`,
          description: `${created.customer} ${registrationTitle}가 등록되었습니다.`,
        })
        router.push(`/activity/quotations/${created.id}`)
        return
      } catch {
        const created = createQuotation(normalized)
        toast({
          title: `${registrationTitle} 등록 완료`,
          description: `${created.customer} ${registrationTitle}가 등록되었습니다.`,
        })
        router.push(`/activity/quotations/${created.id}`)
      }
      return
    }

    if (category === "activities") {
      if (!activityCustomer || !activityForm.date || !activityForm.activityMode || !activityForm.activityContent || !activityForm.content) {
        toast({
          title: "활동 필수값 확인",
          description: "고객사, 활동일, 활동형태, 활동내용, 주요 내용을 입력해주십시오.",
        })
        return
      }

      const opportunityName = activityOpportunity === "미확인" ? "" : activityOpportunity
      const localRequestId = Number.parseInt((linkedRequest?.id ?? linkedRequestId).replace(/[^\d]/g, ""), 10)
      const salesActivityRequestId = Number.isNaN(localRequestId) ? undefined : localRequestId

      try {
        const created = await createBackendActivityRecord({
          customerName: activityCustomer,
          opportunityName,
          opportunityCode: activityOpportunityCode,
          activityMode: activityForm.activityMode,
          activityContent: activityForm.activityContent,
          content: activityForm.content,
          location: activityForm.location,
          activityDate: activityForm.date,
          issues: activityForm.issues,
          nextAction: activityForm.nextAction,
          status: "완료",
          requestId: (linkedRequest?.id ?? linkedRequestId) || undefined,
          salesActivityRequestId,
        })
        toast({
          title: "영업활동 등록 완료",
          description: `${created.customer} 영업활동이 등록되었습니다.`,
        })
        router.push(`/activity/activities/${created.id}`)
      } catch {
        toast({
          title: "영업활동 등록 실패",
          description: "백엔드에 영업활동을 저장하지 못했습니다.",
        })
        return
      }
      return
    }

    if (category !== "requests") {
      router.push("/activity")
      return
    }

    try {
      const created = await createBackendActivityRequest({
        ...form,
        attachments: requestAttachments,
      })
      toast({
        title: "활동 요청 등록 완료",
        description: `${created.receiver} 담당자에게 접수 확인 티켓을 전송했습니다.`,
      })
      router.push(`/activity/requests/${created.id}`)
      return
    } catch {
      const created = createActivityRequest({
        ...form,
        attachments: requestAttachments,
      })
      toast({
        title: "활동 요청 등록 완료",
        description: `${created.receiver} 담당자에게 접수 확인 티켓을 전송했습니다.`,
      })
      router.push(`/activity/requests/${created.id}`)
    }
  }

  const handleActivityCustomerSelect = (customer: CustomerRecord | null) => {
    setActivityCustomer(customer?.name ?? "")
    setActivityCustomerCode(customer?.id ?? "")
    const firstOpportunity = customer ? getOpportunitiesByCustomerName(customer.name)[0] : null
    setActivityOpportunity(firstOpportunity?.name ?? (customer ? "미확인" : ""))
    setActivityOpportunityCode(firstOpportunity?.id ?? "")
  }

  const handleActivityOpportunityChange = (value: string) => {
    const opportunity = activityOpportunityOptions.find((item) => item.name === value)
    setActivityOpportunity(value)
    setActivityOpportunityCode(value === "미확인" ? "" : opportunity?.id ?? "")
  }

  const handleActivityOpportunitySuggestionSelect = (suggestion: EntitySuggestion | null) => {
    if (!suggestion) {
      setActivityOpportunityCode("")
      return
    }

    setActivityOpportunity(suggestion.label)
    setActivityOpportunityCode(suggestion.code || suggestion.id)
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
                      registrant: "",
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
                    onOpportunitySuggestionSelect={handleActivityOpportunitySuggestionSelect}
                    requesterValue={activityRequester}
                    onRequesterChange={setActivityRequester}
                    requestIdValue={linkedRequest?.id ?? linkedRequestId}
                    values={activityForm}
                    onValuesChange={setActivityForm}
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
                        <Input
                          value={form.requester}
                          onChange={(event) => setForm((prev) => ({ ...prev, requester: event.target.value }))}
                          placeholder="요청자 이름을 입력하세요"
                        />
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
                        <EntityAutocomplete
                          value={form.opportunity}
                          target="opportunities"
                          onValueChange={(value) => {
                            setForm((prev) => ({
                              ...prev,
                              opportunity: value,
                              opportunityCode: "",
                            }))
                          }}
                          onSelect={(suggestion) => {
                            if (!suggestion) {
                              setForm((prev) => ({ ...prev, opportunityCode: "" }))
                              return
                            }
                            setForm((prev) => ({
                              ...prev,
                              opportunity: suggestion.label,
                              opportunityCode: suggestion.code || suggestion.id,
                            }))
                          }}
                          disabled={!matchedCustomer}
                          allowCustomValue
                          placeholder={matchedCustomer ? "사업기회를 입력하세요" : "고객사를 먼저 입력하세요"}
                          emptyMessage="등록된 사업기회가 없습니다."
                          filterSuggestion={(suggestion) =>
                            !matchedCustomer ||
                            suggestion.metadata.customerCode === matchedCustomer.id ||
                            suggestion.metadata.customerId === matchedCustomer.id
                          }
                        />
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
                    <Input
                      type="file"
                      multiple
                      onChange={(event) => {
                        void handleAttachmentChange(
                          event.target.files,
                          category === "activities" ? setActivityAttachments : setRequestAttachments,
                        )
                        event.target.value = ""
                      }}
                    />
                    {currentAttachments.length > 0 ? (
                      <div className="space-y-2 rounded-md border border-border p-3">
                        {currentAttachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                            <div className="min-w-0 flex-1">
                              <a href={attachment.dataUrl} download={attachment.name} className="truncate text-primary hover:underline">
                                {attachment.name}
                              </a>
                              <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (category === "activities") {
                                  setActivityAttachments((prev) => prev.filter((item) => item.id !== attachment.id))
                                  return
                                }

                                setRequestAttachments((prev) => prev.filter((item) => item.id !== attachment.id))
                              }}
                            >
                              삭제
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Input readOnly value="등록된 첨부파일이 없습니다." />
                    )}
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
