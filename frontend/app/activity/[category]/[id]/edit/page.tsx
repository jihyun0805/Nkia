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
import { ActivityFormFields } from "@/components/erp/searchable-activity-form-fields"
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { QuotationSheet, normalizeQuotationForm, type QuotationFormState } from "@/components/erp/quotation-sheet"
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
  type ActivityRequestRecord,
  type QuotationRecord,
  activityRequestTypeOptions,
  getCategoryLabel,
} from "@/lib/activity-data"
import { toast } from "@/hooks/use-toast"
import { getActivityRequests, subscribeWorkflowUpdates, updateActivityRequest } from "@/lib/activity-request-workflow"
import { currentUser } from "@/lib/current-user"
import { type CustomerRecord, type OpportunityRecord, getCustomerByCode, getCustomerByName, getOpportunitiesByCustomerName } from "@/lib/finding-data"
import { type EntitySuggestion } from "@/lib/entity-suggestions-api"
import { getQuotations, subscribeQuotationUpdates } from "@/lib/quotation-workflow"
import { loadBackendActivityRecord, loadBackendActivityRecords, updateBackendActivityRecord } from "@/lib/sales-activity-backend"
import { loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import {
  deleteBackendQuotationRecord,
  loadBackendQuotationRecords,
  updateBackendQuotationRecord,
} from "@/lib/sales-quotation-backend"
import { findUserByToken, formatUserDisplayName } from "@/lib/user-utils"
import { useBackendUsers } from "@/lib/use-backend-users"

const fullWidthFieldLabels = ["요청 내용"]

export default function ActivityEditPage() {
  const params = useParams<{ category: ActivityCategory; id: string }>()
  const router = useRouter()
  const category = params.category
  const id = params.id
  const backendUsers = useBackendUsers()
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([])
  const [activityDetail, setActivityDetail] = useState<ActivityRecord | null | undefined>(undefined)
  const [requests, setRequests] = useState<ActivityRequestRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [activityCustomer, setActivityCustomer] = useState("")
  const [activityCustomerCode, setActivityCustomerCode] = useState("")
  const [activityOpportunity, setActivityOpportunity] = useState("")
  const [activityOpportunityCode, setActivityOpportunityCode] = useState("")
  const [activityRegistrant, setActivityRegistrant] = useState("")
  const [activityRequester, setActivityRequester] = useState("")
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
  const [quotationForm, setQuotationForm] = useState<QuotationFormState | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [requestForm, setRequestForm] = useState({
    date: "",
    type: "",
    title: "",
    requester: "",
    receiver: "",
    customerCode: "",
    customer: "",
    opportunityCode: "",
    opportunity: "",
    dueDate: "",
    content: "",
  })
  const quotationDisplayRef = quotationForm?.refNumber?.trim() || "Ref No"

  const scrollToTop = () => {
    window.scrollTo(0, 0)
    const scrollContainer = document.querySelector("main")
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0)
    }
  }

  useEffect(() => {
    let cancelled = false

    if (category !== "activities") {
      setActivityDetail(undefined)
      return
    }

    setActivityDetail(undefined)

    loadBackendActivityRecord(id)
      .then((record) => {
        if (!cancelled) {
          setActivityDetail(record)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivityDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [category, id])

  useEffect(() => {
    let cancelled = false

    loadBackendActivityRecords()
      .then((records) => {
        if (!cancelled) {
          setActivityRecords(records)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivityRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const sync = () => {
      if (!cancelled) {
        setRequests(getActivityRequests())
      }
    }

    loadBackendActivityRequests()
      .then((items) => {
        if (!cancelled) {
          setRequests(items)
        }
      })
      .catch(() => {
        sync()
      })

    const unsubscribe = subscribeWorkflowUpdates(sync)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const sync = () => {
      if (!cancelled) {
        setQuotations(getQuotations())
      }
    }

    loadBackendQuotationRecords()
      .then(() => sync())
      .catch(() => sync())

    const unsubscribe = subscribeQuotationUpdates(sync)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const item = useMemo(() => {
    if (category === "activities") return activityDetail ?? activityRecords.find((entry) => entry.id === id) ?? null
    if (category === "quotations") return quotations.find((entry) => entry.id === id) ?? null
    return requests.find((entry) => entry.id === id) ?? null
  }, [activityDetail, activityRecords, category, id, quotations, requests])

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
    setActivityRegistrant(activity.registrant ?? "")
    setActivityRequester(activity.requesterUserId ?? activity.requester ?? "")
    setActivityForm({
      date: activity.date,
      activityMode: activity.activityMode ?? "",
      activityContent: activity.activityContent ?? "",
      location: activity.location ?? "",
      attendees: activity.attendees ?? "",
      content: activity.content ?? "",
      issues: activity.issues ?? "",
      nextAction: activity.nextAction ?? "",
    })
  }, [category, item])

  useEffect(() => {
    if (category !== "quotations" || !item) return

    const quotation = item as QuotationRecord
    setQuotationForm({
      refNumber: quotation.refNumber ?? quotation.id,
      date: quotation.date,
      customerCode: quotation.customerCode ?? "",
      opportunityCode: quotation.opportunityCode ?? "",
      customer: quotation.customer,
      opportunity: quotation.opportunity,
      proposalType: quotation.proposalType,
      productGroup: quotation.productGroup,
      salesRep: quotation.salesRep,
      paymentTerms: quotation.paymentTerms ?? "현금",
      contactName: quotation.contactName ?? "",
      items: quotation.items.map((entry) => ({ ...entry })),
      solutionSectionTitle: quotation.solutionSectionTitle ?? quotation.items[0]?.name ?? "1) Solution Package",
      solutionRows: quotation.solutionRows?.map((entry) => ({ ...entry })) ?? [],
      customizingSectionTitle: quotation.customizingSectionTitle ?? quotation.items[1]?.name ?? "2) 인건비-커스터마이징",
      customizingRows: quotation.customizingRows?.map((entry) => ({ ...entry })) ?? [],
      templateText: quotation.templateText,
      approvalFlow: quotation.approvalFlow,
      changeHistory: quotation.changeHistory?.map((entry) => ({ ...entry })) ?? [],
      remarks: quotation.remarks ?? "",
      amount: quotation.amount,
      validity: quotation.validity,
      status: quotation.status,
    })
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
      title: request.title ?? "",
      requester: request.requestUserName ?? request.requester ?? currentUser.name,
      receiver: request.targetUserName ?? request.receiver ?? "",
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
  const activityRequestBackendId = (item as ActivityRecord | null)?.salesActivityRequestId
  const receiverUser = findUserByToken(backendUsers, requestForm.receiver)
  const receiverUserId = receiverUser?.id ?? ""
  const resolveSelectedActivityOpportunity = (value: string, code?: string) => {
    const normalizedValue = value.trim().toLowerCase()
    const normalizedCode = code?.trim().toLowerCase()
    if ((!normalizedValue || normalizedValue === "미확인") && !normalizedCode) return null

    return (
      activityOpportunityOptions.find((entry) => {
        const entryCode = (entry as OpportunityRecord & { opportunityCode?: string }).opportunityCode ?? String(entry.id)
        const entryName = (entry as OpportunityRecord & { opportunityName?: string }).opportunityName ?? entry.name
        const candidates = [entryCode, String(entry.id), entryName]
          .filter((candidate): candidate is string => typeof candidate === "string")
          .map((candidate) => candidate.trim().toLowerCase())

        if (normalizedCode && candidates.includes(normalizedCode)) {
          return true
        }

        return normalizedValue ? candidates.includes(normalizedValue) : false
      }) ?? null
    )
  }

  const handleActivityCustomerSelect = (customer: CustomerRecord | null) => {
    setActivityCustomer(customer?.name ?? "")
    setActivityCustomerCode(customer?.id ?? "")
    setActivityOpportunity("")
    setActivityOpportunityCode("")
  }

  const handleActivityOpportunityChange = (value: string) => {
    const normalizedValue = value.trim().toLowerCase()
    const opportunity = activityOpportunityOptions.find((entry) => {
      const entryCode = (entry as OpportunityRecord & { opportunityCode?: string }).opportunityCode ?? String(entry.id)
      const entryName = (entry as OpportunityRecord & { opportunityName?: string }).opportunityName ?? entry.name
      return [entryCode, String(entry.id), entryName]
        .some((candidate) => String(candidate).trim().toLowerCase() === normalizedValue)
    })
    setActivityOpportunity(value)
    setActivityOpportunityCode(
      value === "미확인"
        ? ""
        : (opportunity as OpportunityRecord & { opportunityCode?: string } | undefined)?.opportunityCode ??
            (opportunity?.id != null ? String(opportunity.id) : ""),
    )
  }

  const handleActivityCustomerValueChange = (value: string) => {
    setActivityCustomer(value)
    const matchedCustomer = getCustomerByName(value)
    setActivityCustomerCode(matchedCustomer?.id ?? "")
    setActivityOpportunity("")
    setActivityOpportunityCode("")
  }

  const handleActivityOpportunitySuggestionSelect = (suggestion: EntitySuggestion | null) => {
    if (!suggestion) {
      setActivityOpportunityCode("")
      return
    }

    setActivityOpportunity(suggestion.label)
    setActivityOpportunityCode(suggestion.code || suggestion.id)
  }

  const handleSubmit = async () => {
    if (category === "quotations") {
      if (!quotationForm) return
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
        const updatedQuotation = await updateBackendQuotationRecord(id, normalized)
        scrollToTop()
        toast({
          title: "견적 수정 완료",
          description: `${updatedQuotation.customer} 견적서가 수정되었습니다.`,
        })
        router.push(`/activity/${category}/${id}?historyRefresh=${Date.now()}`)
        return
      } catch {
        toast({
          title: "견적 수정 실패",
          description: "백엔드에서 견적서를 수정하지 못했습니다.",
        })
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

      const selectedActivityOpportunity = resolveSelectedActivityOpportunity(activityOpportunity, activityOpportunityCode)
      if (activityOpportunityOptions.length > 0 && !selectedActivityOpportunity) {
        toast({
          title: "사업기회 선택 필요",
          description: "고객사에 연결된 사업기회를 목록에서 선택해주십시오.",
        })
        return
      }

      const opportunityName = activityOpportunity === "미확인" ? "" : selectedActivityOpportunity?.name ?? activityOpportunity
      try {
        const updatedActivity = await updateBackendActivityRecord(id, {
          projectOpportunityId: selectedActivityOpportunity?.backendId ?? (item as ActivityRecord).projectOpportunityId,
          customerName: activityCustomer,
          opportunityName,
          opportunityCode:
            (selectedActivityOpportunity as OpportunityRecord & { opportunityCode?: string } | null)?.opportunityCode ??
            activityOpportunityCode,
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
          status: (item as ActivityRecord).status,
          salesActivityRequestId: activityRequestBackendId,
        })

        scrollToTop()
        toast({
          title: "영업활동 수정 완료",
          description: `${updatedActivity.customer} 영업활동이 수정되었습니다.`,
        })
        router.push(`/activity/${category}/${id}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : "백엔드에서 영업활동을 수정하지 못했습니다."
        scrollToTop()
        toast({
          title: "영업활동 수정 실패",
          description: message,
        })
      }
      return
    }

    if (!requestForm.customer) {
      toast({
        title: "활동 요청 필수값 확인",
        description: "요청 제목, 고객사, 요청 유형, 담당자, 활동일, 요청 내용을 입력해주십시오.",
      })
      return
    }

    if (!canEditRequest) return

    const updated = updateActivityRequest(id, {
      ...requestForm,
    })
    if (!updated) return

    const updatedRequest = updated as ActivityRequestRecord

    scrollToTop()
    toast({
      title: "활동 요청 수정 완료",
      description: `${updatedRequest.receiver} 담당자에게 수정 알림을 전송했습니다.`,
    })
    router.push(`/activity/${category}/${id}`)
  }

  const handleDeleteQuotation = () => {
    if (category !== "quotations") return

    void (async () => {
      try {
        await deleteBackendQuotationRecord(id)
        scrollToTop()
        toast({
          title: "견적 삭제 완료",
          description: `${id} 견적서가 삭제되었습니다.`,
        })
        router.push("/activity")
      } catch (error) {
        toast({
          title: "견적 삭제 실패",
          description: error instanceof Error ? error.message : "백엔드에서 견적서를 삭제하지 못했습니다.",
        })
      }
    })()
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
          <div className={`mx-auto space-y-6 ${category === "quotations" ? "max-w-[1440px]" : "max-w-6xl"}`}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity">활동</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{category === "quotations" ? quotationDisplayRef : id}</BreadcrumbPage>
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
                  <ActivityFormFields
                    defaultValues={{
                      ...(item as ActivityRecord),
                      activityMode: activityForm.activityMode || (item as ActivityRecord).activityMode,
                      requester: activityRequester,
                      registrant: activityRegistrant,
                      activityContent: activityForm.activityContent || (item as ActivityRecord).activityContent,
                      opportunity: activityOpportunity,
                    }}
                    registrantValue={activityRegistrant}
                    onRegistrantChange={setActivityRegistrant}
                    customerValue={activityCustomer}
                    customerCodeValue={activityCustomerCode}
                    onCustomerSelect={handleActivityCustomerSelect}
                    onCustomerValueChange={handleActivityCustomerValueChange}
                    onUnregisteredCustomerAttempt={() => {}}
                    opportunityValue={activityOpportunity}
                    opportunityOptions={activityOpportunityOptions}
                    onOpportunityChange={handleActivityOpportunityChange}
                    onOpportunitySuggestionSelect={handleActivityOpportunitySuggestionSelect}
                    opportunitySelectionOnly
                    requesterValue={activityRequester}
                    onRequesterChange={setActivityRequester}
                    values={activityForm}
                    onValuesChange={setActivityForm}
                  />
                ) : category === "requests" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: "요청일", key: "date", type: "date" },
                      { label: "요청 유형 *", key: "type" },
                      { label: "요청 제목 *", key: "title" },
                      { label: "요청자", key: "requester" },
                      { label: "담당자 *", key: "receiver" },
                      { label: "고객사 *", key: "customer" },
                      { label: "사업기회", key: "opportunity" },
                      { label: "활동일 *", key: "dueDate", type: "date" },
                      { label: "요청 내용 *", key: "content" },
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
                        ) : field.key === "title" ? (
                          <Input
                            value={requestForm.title}
                            onChange={(event) => setRequestForm((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="요청 제목을 입력하세요"
                          />
                        ) : field.key === "requester" ? (
                          <Input value={currentUser.name} readOnly />
                        ) : field.key === "receiver" ? (
                          <UserIdPicker
                            value={receiverUserId}
                            users={backendUsers}
                            onValueChange={(value) => {
                              const user = findUserByToken(backendUsers, value)
                              setRequestForm((prev) => ({ ...prev, receiver: formatUserDisplayName(user) }))
                            }}
                            placeholder="담당자를 선택하세요"
                          />
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
                        ) : field.key === "opportunity" ? (
                          <Select
                            value={requestForm.opportunity}
                            onValueChange={(value) => {
                              const opportunity = opportunityOptions.find((entry) => entry.name === value)
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
                            onChange={(event) => setRequestForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : quotationForm ? (
                <QuotationSheet
                  mode="edit"
                  form={quotationForm}
                  referenceId={quotationForm?.refNumber?.trim() ?? ""}
                  onChange={(updater) => setQuotationForm((prev) => (prev ? updater(prev) : prev))}
                />
                ) : null}

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={`/activity/${category}/${id}`}>취소</Link>
                  </Button>
                  {category === "quotations" && (
                    <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                      삭제
                    </Button>
                  )}
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>견적서를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 되돌릴 수 없습니다. 견적 상세와 목록에서 모두 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuotation}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
