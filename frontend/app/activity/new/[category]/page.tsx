"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
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
import { QuotationSheet, createEmptyQuotationForm, normalizeQuotationForm, type QuotationFormState } from "@/components/erp/quotation-sheet"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { activityRequestTypeOptions, type ActivityCategory, type ActivityRequestRecord, getCategoryLabel } from "@/lib/activity-data"
import {
  type CustomerRecord,
  type OpportunityRecord,
  getCustomerByCode,
  getCustomerByName,
  hasRegisteredCustomer,
} from "@/lib/finding-data"
import { loadBackendFindingData, loadBackendProjectOpportunitiesByCustomer, type FindingBackendData, type ProjectOpportunitySummaryResponse } from "@/lib/finding-backend"
import { toast } from "@/hooks/use-toast"
import { useChatbotPrefill } from "@/lib/use-chatbot-prefill"
import { X } from "lucide-react"
import { currentUser } from "@/lib/current-user"
import { createBackendActivityRecord } from "@/lib/sales-activity-backend"
import { createBackendActivityRequest, loadBackendActivityRequest, loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import { type EntitySuggestion } from "@/lib/entity-suggestions-api"
import { createBackendQuotationRecord, getQuotationCreateBlockReason } from "@/lib/sales-quotation-backend"
import { findUserByToken, formatUserDisplayName } from "@/lib/user-utils"
import { useBackendUsers } from "@/lib/use-backend-users"

// 활동 신규 등록 라우트 구분값.
// - activities: 영업활동 등록
// - quotations: 견적 등록
// - requests: 활동 요청 등록
// category 파라미터가 이 값 중 하나여야 각 등록 폼을 렌더링할 수 있다.
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

function ActivityCategoryNewPageContent() {
  const params = useParams<{ category: ActivityCategory }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = params.category
  const linkedRequestId = searchParams.get("requestId") ?? ""
  const [selectedActivityRequestId, setSelectedActivityRequestId] = useState(linkedRequestId)
  const [activityCustomer, setActivityCustomer] = useState("")
  const [activityCustomerCode, setActivityCustomerCode] = useState("")
  const [activityOpportunity, setActivityOpportunity] = useState("")
  const [activityOpportunityCode, setActivityOpportunityCode] = useState("")
  const [activityRequester, setActivityRequester] = useState("")
  const [activityRegistrant, setActivityRegistrant] = useState("")
  const [linkedRequest, setLinkedRequest] = useState<ActivityRequestRecord | null>(null)
  const [activityRequests, setActivityRequests] = useState<ActivityRequestRecord[]>([])
  const [activityOpportunityOptions, setActivityOpportunityOptions] = useState<ProjectOpportunitySummaryResponse[]>([])
  const [isActivityOpportunityLoading, setIsActivityOpportunityLoading] = useState(false)
  const [quotationForm, setQuotationForm] = useState<QuotationFormState>(createEmptyQuotationForm())
  const [findingData, setFindingData] = useState<FindingBackendData>(emptyFindingData)
  const [isCustomerAlertOpen, setIsCustomerAlertOpen] = useState(false)
  const backendUsers = useBackendUsers()
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
  const [requestOpportunityOptions, setRequestOpportunityOptions] = useState<ProjectOpportunitySummaryResponse[]>([])
  const [isRequestOpportunityLoading, setIsRequestOpportunityLoading] = useState(false)
  const [form, setForm] = useState({
    date: "",
    type: "",
    title: "",
    requester: currentUser.name,
    receiver: "",
    customerCode: "",
    customer: "",
    opportunityCode: "",
    opportunity: "",
    dueDate: "",
    content: "",
  })
  const matchedCustomer = category === "requests" ? getCustomerByName(form.customer) : null
  const selectedRequestCustomer =
    category === "requests"
      ? findCustomerByNameOrCode(findingData.customers, form.customer, form.customerCode) ?? matchedCustomer
      : null
  const selectedActivityCustomer =
    category === "activities"
      ? findCustomerByNameOrCode(findingData.customers, activityCustomer, activityCustomerCode)
      : null
    const linkedRequestBackendId =
      linkedRequest?.backendId ??
      (linkedRequestId && /^\d+$/.test(linkedRequestId) ? Number(linkedRequestId) : undefined)
  const resolveSelectedActivityOpportunity = (value: string, code?: string) => {
    const normalizedValue = value.trim().toLowerCase()
    const normalizedCode = code?.trim().toLowerCase()
    if ((!normalizedValue || normalizedValue === "미확인") && !normalizedCode) return null

    return (
      activityOpportunityOptions.find((item) => {
        const candidates = [item.opportunityCode, String(item.id), item.opportunityName]
          .filter((candidate): candidate is string => typeof candidate === "string")
          .map((candidate) => candidate.trim().toLowerCase())

        if (normalizedCode && candidates.includes(normalizedCode)) {
          return true
        }

        return normalizedValue ? candidates.includes(normalizedValue) : false
      }) ?? null
    )
  }

  // 챗봇 create_draft (sales_activity / quotation) prefill — category 별로 다르게 매핑
  const { values: chatbotPrefill, hasPrefill: hasChatbotPrefill, clear: clearChatbotPrefill } = useChatbotPrefill()
  const prefillAppliedRef = useRef(false)
  useEffect(() => {
    if (!hasChatbotPrefill || prefillAppliedRef.current) return
    if (linkedRequestId) return  // 기존 request 연결된 경우 prefill 비활성
    prefillAppliedRef.current = true
    const slot = chatbotPrefill

    // 공통 entity 슬롯 (모든 카테고리)
    if (slot.customer_name) setActivityCustomer(slot.customer_name)
    if (slot.customer_code) setActivityCustomerCode(slot.customer_code)
    if (slot.opportunity_code) setActivityOpportunityCode(slot.opportunity_code)
    if (slot.opportunity_name) setActivityOpportunity(slot.opportunity_name)
    if (slot.requested_by) setActivityRequester(slot.requested_by)
    if (slot.registered_by) setActivityRegistrant(slot.registered_by)

    if (category === "activities") {
      setActivityForm((prev) => ({
        ...prev,
        date: slot.activity_date || prev.date,
        activityMode: slot.activity_form || prev.activityMode,
        activityContent: slot.activity_content || prev.activityContent,
        location: slot.activity_location || prev.location,
        attendees: slot.participants || prev.attendees,
        content: slot.summary || prev.content,
        issues: slot.issues || prev.issues,
        nextAction: slot.next_action || prev.nextAction,
      }))
    } else if (category === "quotations") {
      setQuotationForm((prev) => ({
        ...prev,
        customer: slot.customer_name || prev.customer,
        customerCode: slot.customer_code || prev.customerCode,
        opportunityCode: slot.opportunity_code || prev.opportunityCode,
        opportunity: slot.opportunity_name || prev.opportunity,
        date: slot.quote_date || prev.date,
        proposalType: (slot.proposal_type as typeof prev.proposalType) || prev.proposalType,
        productGroup: (slot.product_family as typeof prev.productGroup) || prev.productGroup,
        salesRep: slot.sales_representative || prev.salesRep,
      }))
    } else {
      // 활동요청 (form)
      setForm((prev) => ({
        ...prev,
        customerCode: slot.customer_code || prev.customerCode,
        customer: slot.customer_name || prev.customer,
        opportunityCode: "",
        opportunity: "",
        title: slot.title || slot.request_title || prev.title,
        requester: slot.requested_by || prev.requester,
        content: slot.summary || prev.content,
      }))
    }

    const applied = Object.keys(slot).length
    if (applied > 0) {
      const labelByCategory: Record<string, string> = {
        activities: "활동",
        quotations: "견적서",
      }
      const label = labelByCategory[category] || "활동요청"
      toast({ title: `챗봇이 ${label} 초안 prefill`, description: `${applied}개 슬롯 반영 — 확인 후 저장하세요.` })
    }
    const id = window.setTimeout(() => clearChatbotPrefill(), 100)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChatbotPrefill, category, linkedRequestId])

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

    const sync = (requests: ActivityRequestRecord[]) => {
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
      .catch(() => sync([]))
    return () => {
      cancelled = true
    }
  }, [category, linkedRequestId])

  useEffect(() => {
    if (category !== "activities") return
    setSelectedActivityRequestId(linkedRequestId)
  }, [category, linkedRequestId])

  useEffect(() => {
    if (category !== "requests") return

    let cancelled = false

    if (!selectedRequestCustomer?.backendId) {
      setRequestOpportunityOptions([])
      setIsRequestOpportunityLoading(false)
      return
    }

    setIsRequestOpportunityLoading(true)
    void loadBackendProjectOpportunitiesByCustomer(selectedRequestCustomer.backendId)
      .then((opportunities) => {
        if (!cancelled) {
          setRequestOpportunityOptions(opportunities)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequestOpportunityOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRequestOpportunityLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [category, selectedRequestCustomer?.backendId])

  useEffect(() => {
    if (category !== "activities") return

    let cancelled = false

    if (!selectedActivityCustomer?.backendId) {
      setActivityOpportunityOptions([])
      setIsActivityOpportunityLoading(false)
      return
    }

    setIsActivityOpportunityLoading(true)
    void loadBackendProjectOpportunitiesByCustomer(selectedActivityCustomer.backendId)
      .then((opportunities) => {
        if (!cancelled) {
          setActivityOpportunityOptions(opportunities)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivityOpportunityOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsActivityOpportunityLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [category, selectedActivityCustomer?.backendId])

  useEffect(() => {
    if (category !== "activities") return

    let cancelled = false

    const sync = (requests: ActivityRequestRecord[]) => {
      if (cancelled) return

      if (!selectedActivityRequestId) {
        setLinkedRequest(null)
        return
      }

      const request = requests.find((item) => item.id === selectedActivityRequestId) ?? null
      if (request) {
        setLinkedRequest(request)
        return
      }

      const requestId = Number.parseInt(selectedActivityRequestId, 10)
      if (Number.isNaN(requestId)) {
        setLinkedRequest(null)
        return
      }

      void loadBackendActivityRequest(requestId)
        .then((detail) => {
          if (!cancelled) {
            setLinkedRequest(detail)
            setActivityRequests((current) => [detail, ...current.filter((item) => item.id !== detail.id)])
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLinkedRequest(null)
          }
        })
    }

    loadBackendActivityRequests()
      .then((requests) => {
        if (!cancelled) {
          setActivityRequests(requests)
        }
        sync(requests)
      })
      .catch(() => {
        if (!cancelled) {
          setActivityRequests([])
        }
        sync([])
      })
    return () => {
      cancelled = true
    }
  }, [category, selectedActivityRequestId])

  useEffect(() => {
    if (category !== "activities") return
    if (!linkedRequestId || !linkedRequest) return

    setActivityRequester(linkedRequest.requester ?? "")
    setActivityCustomer(linkedRequest.customer ?? "")
    setActivityCustomerCode(linkedRequest.customerCode ?? "")
    setActivityOpportunity("")
    setActivityOpportunityCode("")
    setActivityForm((prev) => ({
      ...prev,
      date: linkedRequest.dueDate || linkedRequest.date || prev.date,
      activityContent: linkedRequest.type ?? prev.activityContent,
    }))
  }, [category, linkedRequest, linkedRequestId])

  if (!categories.includes(category)) {
    return null
  }

  const title = getCategoryLabel(category)
  const isProposalRequest =
    category === "quotations" &&
    !!linkedRequestId &&
    ["제안서 작성", "SI 제안서 작성"].includes(linkedRequest?.type ?? "")
  const registrationTitle = category === "activities" ? "활동" : category === "quotations" && isProposalRequest ? "제안서" : title

  const targetCustomer =
    category === "activities" ? activityCustomer : category === "quotations" ? quotationForm.customer : form.customer
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
      const blockReason = getQuotationCreateBlockReason(normalized)
      if (blockReason) {
        toast({
          title: "견적 입력 확인",
          description: blockReason,
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
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        if (message) {
          toast({
            title: `${registrationTitle} 등록 실패`,
            description: message,
          })
          return
        }
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

      if (linkedRequest?.salesActivityId) {
        toast({
          title: "이미 연결된 활동 요청",
          description: "이 요청은 이미 활동에 연결되어 있습니다. 기존 활동 상세로 이동합니다.",
        })
        router.push(`/activity/activities/${linkedRequest.salesActivityId}`)
        return
      }

      if (selectedActivityCustomer?.backendId && isActivityOpportunityLoading) {
        toast({
          title: "사업기회 조회 중",
          description: "고객사에 연결된 사업기회를 불러오는 중입니다. 잠시 후 다시 시도해주십시오.",
        })
        return
      }

      const selectedActivityOpportunity = resolveSelectedActivityOpportunity(activityOpportunity, activityOpportunityCode)

      if (selectedActivityCustomer?.backendId && !selectedActivityOpportunity) {
        toast({
          title: "사업기회 선택 필요",
          description: "선택한 고객사에 연결된 사업기회를 목록에서 선택해주십시오.",
        })
        return
      }

      const opportunityName = activityOpportunity === "미확인" ? "" : selectedActivityOpportunity?.opportunityName ?? activityOpportunity
      try {
        const created = await createBackendActivityRecord({
          customerName: activityCustomer,
          projectOpportunityId: selectedActivityOpportunity?.id,
          opportunityName,
          opportunityCode: selectedActivityOpportunity?.opportunityCode ?? activityOpportunityCode,
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
          salesActivityRequestId: linkedRequestBackendId,
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

    if (!form.title || !form.customer) {
      toast({
        title: "활동 요청 필수값 확인",
        description: "요청 제목, 고객사, 요청 유형, 담당자, 활동일, 요청 내용을 입력해주십시오.",
      })
      return
    }

    if (!selectedRequestCustomer?.backendId) {
      toast({
        title: "고객사 확인 필요",
        description: "등록된 고객사를 선택해야 활동 요청을 저장할 수 있습니다.",
      })
      return
    }

    if (selectedRequestCustomer?.backendId && isRequestOpportunityLoading) {
      toast({
        title: "사업기회 조회 중",
        description: "고객사에 연결된 사업기회를 불러오는 중입니다. 잠시 후 다시 시도해주십시오.",
      })
      return
    }

    try {
      const created = await createBackendActivityRequest({
        ...form,
        companyId: selectedRequestCustomer.backendId,
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
    setActivityOpportunity("")
    setActivityOpportunityCode("")
  }

  const handleActivityCustomerValueChange = (value: string) => {
    setActivityCustomer(value)
    const matchedCustomer =
      getCustomerByName(value) ??
      findCustomerByNameOrCode(findingData.customers, value, value)
    const nextCustomerCode = matchedCustomer?.id ?? ""
    setActivityCustomerCode(nextCustomerCode)
    setActivityOpportunity("")
    setActivityOpportunityCode("")
  }

  const handleActivityOpportunityChange = (value: string) => {
    const normalizedValue = value.trim().toLowerCase()
    const opportunity = activityOpportunityOptions.find((item) => {
      return [item.opportunityCode, String(item.id), item.opportunityName]
        .filter((candidate): candidate is string => typeof candidate === "string")
        .some((candidate) => candidate.trim().toLowerCase() === normalizedValue)
    })
    setActivityOpportunity(value)
    setActivityOpportunityCode(value === "미확인" ? "" : opportunity?.opportunityCode ?? (opportunity?.id != null ? String(opportunity.id) : ""))
  }

  const handleActivityOpportunitySuggestionSelect = (suggestion: EntitySuggestion | null) => {
    if (!suggestion) {
      setActivityOpportunityCode("")
      return
    }

    setActivityOpportunity(suggestion.label)
    setActivityOpportunityCode(suggestion.code || suggestion.id)
  }

  const handleRequestCustomerSelection = (customer: CustomerRecord | null) => {
    setForm((prev) => {
      const nextCustomer = customer?.name ?? ""
      const nextCustomerCode = customer?.id ?? ""

      return {
        ...prev,
        customer: nextCustomer,
        customerCode: nextCustomerCode,
        opportunity: "",
        opportunityCode: "",
      }
    })
  }

  const handleRequestCustomerValueChange = (value: string) => {
    const matched = findCustomerByNameOrCode(findingData.customers, value, value)
    setForm((prev) => {
      const nextCustomer = value
      const nextCustomerCode = matched?.id ?? ""

      return {
        ...prev,
        customer: nextCustomer,
        customerCode: nextCustomerCode,
        opportunity: "",
        opportunityCode: "",
      }
    })
  }

  const handleRequestOpportunityChange = (value: string) => {
    const opportunity = requestOpportunitySelectOptions.find((item) => String(item.id) === value)
    setForm((prev) => ({
      ...prev,
      opportunity: value === "미확인" ? "미확인" : opportunity?.opportunityName ?? value,
      opportunityCode: value === "미확인" ? "" : String(opportunity?.id ?? value),
    }))
  }

  const receiverUser = findUserByToken(backendUsers, form.receiver)
  const receiverUserId = receiverUser?.id ?? ""

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
                      activityMode: activityForm.activityMode,
                      requester: linkedRequest?.requester ?? "",
                      requestId: linkedRequest?.id ?? linkedRequestId,
                      activityContent: linkedRequest?.type ?? "",
                      opportunity: linkedRequest?.opportunity ?? "",
                    }}
                    requestTitle={linkedRequest?.title ?? ""}
                    requesterLocked={Boolean(linkedRequestId)}
                    requestLocked={Boolean(linkedRequestId)}
                    registrantValue={activityRegistrant}
                    onRegistrantChange={setActivityRegistrant}
                    customerValue={activityCustomer}
                    customerCodeValue={activityCustomerCode}
                    onCustomerSelect={handleActivityCustomerSelect}
                    onCustomerValueChange={handleActivityCustomerValueChange}
                    onUnregisteredCustomerAttempt={() => setIsCustomerAlertOpen(true)}
                    opportunityValue={activityOpportunity}
                    opportunityOptions={activityOpportunityOptions as unknown as OpportunityRecord[]}
                    onOpportunityChange={handleActivityOpportunityChange}
                    onOpportunitySuggestionSelect={handleActivityOpportunitySuggestionSelect}
                    opportunitySelectionOnly
                    requestValue={selectedActivityRequestId}
                    requestOptions={activityRequests}
                    onRequestChange={setSelectedActivityRequestId}
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
                        <Label>요청일</Label>
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
                        <Label>요청자</Label>
                        <Input value={currentUser.name} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>담당자 *</Label>
                        <UserIdPicker
                          value={receiverUserId}
                          users={backendUsers}
                          onValueChange={(value) => {
                            const user = findUserByToken(backendUsers, value)
                            setForm((prev) => ({ ...prev, receiver: formatUserDisplayName(user) }))
                          }}
                          placeholder="담당자를 선택하세요"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>고객사 *</Label>
                        <CustomerAutocomplete
                          value={form.customer}
                          onValueChange={handleRequestCustomerValueChange}
                          onSelect={handleRequestCustomerSelection}
                          placeholder="고객사를 입력하세요"
                          onUnregisteredAttempt={() => setIsCustomerAlertOpen(true)}
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
                      <Label>요청 제목 *</Label>
                      <Input
                        value={form.title}
                        onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="요청 제목을 입력하세요"
                      />
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
