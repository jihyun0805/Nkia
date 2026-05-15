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
import { activityRequestTypeOptions, type ActivityCategory, type ActivityRequestRecord, getCategoryLabel } from "@/lib/activity-data"
import { getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import {
  type CustomerRecord,
  getCustomerByCode,
  getCustomerByName,
  getOpportunitiesByCustomerName,
  hasRegisteredCustomer,
} from "@/lib/finding-data"
import { loadBackendFindingData, type FindingBackendData } from "@/lib/finding-backend"
import { toast } from "@/hooks/use-toast"
import { X } from "lucide-react"
import { createBackendActivityRecord } from "@/lib/sales-activity-backend"
import { createBackendActivityRequest, loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import { type EntitySuggestion } from "@/lib/entity-suggestions-api"
import { createBackendQuotationRecord } from "@/lib/sales-quotation-backend"

const categories: ActivityCategory[] = ["activities", "quotations", "requests"]

const emptyFindingData: FindingBackendData = { opportunities: [], customers: [], partners: [] }

function normalizeLookupText(value: string) {
  return value.trim().toLowerCase()
}

function findCustomerByNameOrCode(
  customers: FindingBackendData["customers"],
  customerName: string,
  customerCode: string,
) {
  const normalizedName = normalizeLookupText(customerName)
  const normalizedCode = normalizeLookupText(customerCode)

  return (
    customers.find((customer) => {
      if (normalizedCode && normalizeLookupText(customer.id) === normalizedCode) return true
      if (normalizedName && normalizeLookupText(customer.name) === normalizedName) return true
      return customer.aliases?.some((alias) => normalizeLookupText(alias) === normalizedName) ?? false
    }) ?? null
  )
}

function getOpportunitiesForCustomer(
  findingData: FindingBackendData,
  customerName: string,
  customerCode: string,
) {
  const normalizedName = normalizeLookupText(customerName)
  const normalizedCode = normalizeLookupText(customerCode)

  return findingData.opportunities.filter((opportunity) => {
    const opportunityCustomerCode = normalizeLookupText(opportunity.customerCode)
    const opportunityCustomerName = normalizeLookupText(opportunity.customer)

    return (
      (normalizedCode && opportunityCustomerCode === normalizedCode) ||
      (normalizedName && opportunityCustomerName === normalizedName)
    )
  })
}

function ActivityCategoryNewPageContent() {
  const params = useParams<{ category: ActivityCategory }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = params.category
  const linkedRequestId = searchParams.get("requestId") ?? ""
  const [activityCustomer, setActivityCustomer] = useState("")
  const [activityCustomerCode, setActivityCustomerCode] = useState("")
  const [activityOpportunity, setActivityOpportunity] = useState("")
  const [activityOpportunityCode, setActivityOpportunityCode] = useState("")
  const [activityRequester, setActivityRequester] = useState("")
  const [activityRegistrant, setActivityRegistrant] = useState("")
  const [linkedRequest, setLinkedRequest] = useState<ActivityRequestRecord | null>(null)
  const [quotationForm, setQuotationForm] = useState<QuotationFormState>(createEmptyQuotationForm())
  const [findingData, setFindingData] = useState<FindingBackendData>(emptyFindingData)
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
    receiver: "",
    customerCode: "",
    customer: "",
    opportunityCode: "",
    opportunity: "",
    dueDate: "",
    content: "",
  })

  useEffect(() => {
    let cancelled = false

    void loadBackendFindingData()
      .then((data) => {
        if (!cancelled) {
          setFindingData(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFindingData(emptyFindingData)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

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
  const activityOpportunityOptions = getOpportunitiesForCustomer(findingData, activityCustomer, activityCustomerCode)

  const matchesCustomerName = (customers: CustomerRecord[], customerName: string) => {
    const normalized = customerName.trim().toLowerCase()
    if (!normalized) return false

    return customers.some((customer) => {
      if (customer.name.trim().toLowerCase() === normalized) return true
      return customer.aliases?.some((alias) => alias.trim().toLowerCase() === normalized) ?? false
    })
  }

  const ensureRegisteredCustomer = async () => {
    if (hasRegisteredCustomer(targetCustomer) || getCustomerByName(targetCustomer)) return true

    try {
      const backendFindingData = await loadBackendFindingData()
      if (matchesCustomerName(backendFindingData.customers, targetCustomer)) return true
    } catch {
      // ignore and fall through to the alert
    }

    setIsCustomerAlertOpen(true)
    return false
  }

  const handleSubmit = async () => {
    if (!(await ensureRegisteredCustomer())) return

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
      } catch {
        toast({
          title: `${registrationTitle} 등록 실패`,
          description: "백엔드에 견적서를 저장하지 못했습니다.",
        })
        return
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

      if (activityOpportunityOptions.length > 1 && !activityOpportunityCode) {
        toast({
          title: "사업기회 선택 필요",
          description: "선택한 고객사에 연결된 사업기회가 여러 개 있습니다. 사업기회를 선택해주십시오.",
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
          registrant: activityRegistrant,
          requester: activityRequester,
          activityMode: activityForm.activityMode,
          activityContent: activityForm.activityContent,
          content: activityForm.content,
          location: activityForm.location,
          activityDate: activityForm.date,
          issues: activityForm.issues,
          nextAction: activityForm.nextAction,
          attendees: activityForm.attendees,
          status: "완료",
          requestId: (linkedRequest?.id ?? linkedRequestId) || undefined,
          salesActivityRequestId,
        })
        toast({
          title: "영업활동 등록 완료",
          description: `${created.customer} 영업활동이 등록되었습니다.`,
        })
        router.push(`/activity/activities/${created.id}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : "백엔드에 영업활동을 저장하지 못했습니다."
        toast({
          title: "영업활동 등록 실패",
          description: message,
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
        })
        toast({
          title: "활동 요청 등록 완료",
          description: `${created.receiver} 담당자에게 접수 확인 티켓을 전송했습니다.`,
        })
        router.push(`/activity/requests/${created.id}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : "백엔드에 활동 요청을 저장하지 못했습니다."
        toast({
          title: "활동 요청 등록 실패",
          description: message,
        })
        return
      }
  }

  const handleActivityCustomerSelect = (customer: CustomerRecord | null) => {
    setActivityCustomer(customer?.name ?? "")
    setActivityCustomerCode(customer?.id ?? "")
    const matchedOpportunities = customer ? getOpportunitiesForCustomer(findingData, customer.name, customer.id) : []
    const preservedOpportunity = matchedOpportunities.find((item) => item.name === activityOpportunity || item.id === activityOpportunityCode) ?? null
    const nextOpportunity = matchedOpportunities.length === 1 ? matchedOpportunities[0] : preservedOpportunity
    setActivityOpportunity(nextOpportunity?.name ?? "")
    setActivityOpportunityCode(nextOpportunity?.id ?? "")
  }

  const handleActivityCustomerValueChange = (value: string) => {
    setActivityCustomer(value)
    const matchedCustomer =
      getCustomerByName(value) ??
      findCustomerByNameOrCode(findingData.customers, value, value)
    const nextCustomerCode = matchedCustomer?.id ?? ""
    setActivityCustomerCode(nextCustomerCode)

    const matchedOpportunities = matchedCustomer
      ? getOpportunitiesForCustomer(findingData, matchedCustomer.name, nextCustomerCode)
      : value
        ? getOpportunitiesForCustomer(findingData, value, nextCustomerCode)
        : []
    const preservedOpportunity =
      matchedOpportunities.find((item) => item.name === activityOpportunity || item.id === activityOpportunityCode) ?? null
    const nextOpportunity = matchedOpportunities.length === 1 ? matchedOpportunities[0] : preservedOpportunity
    setActivityOpportunity(nextOpportunity?.name ?? "")
    setActivityOpportunityCode(nextOpportunity?.id ?? "")
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
                      requester: linkedRequest?.requester ?? "",
                      requestId: linkedRequest?.id ?? linkedRequestId,
                      activityContent: linkedRequest?.type ?? "",
                      opportunity: linkedRequest?.opportunity ?? "",
                      }}
                      registrantValue={activityRegistrant}
                      onRegistrantChange={setActivityRegistrant}
                      customerValue={activityCustomer}
                      customerCodeValue={activityCustomerCode}
                      onCustomerSelect={handleActivityCustomerSelect}
                      onCustomerValueChange={handleActivityCustomerValueChange}
                      onUnregisteredCustomerAttempt={() => setIsCustomerAlertOpen(true)}
                      opportunityValue={activityOpportunity}
                    opportunityOptions={activityOpportunityOptions}
                    onOpportunityChange={handleActivityOpportunityChange}
                    onOpportunitySuggestionSelect={handleActivityOpportunitySuggestionSelect}
                    requesterValue={activityRequester}
                    onRequesterChange={setActivityRequester}
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
                        <Input
                          value={form.receiver}
                          onChange={(event) => setForm((prev) => ({ ...prev, receiver: event.target.value }))}
                          placeholder="담당자 이름을 직접 입력하세요"
                        />
                        <p className="text-sm text-muted-foreground">백엔드 사용자 이름과 일치해야 저장됩니다.</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>고객사 *</Label>
                        <CustomerAutocomplete
                          value={form.customer}
                          onValueChange={(value) => {
                            const matched = getCustomerByName(value)
                            setForm((prev) => ({
                              ...prev,
                              customer: value,
                              customerCode: matched?.id ?? prev.customerCode,
                              opportunity: matched ? "미확인" : prev.opportunity,
                              opportunityCode: matched ? "" : prev.opportunityCode,
                            }))
                          }}
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
