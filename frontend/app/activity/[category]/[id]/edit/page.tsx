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
import { QuotationSheet, normalizeQuotationForm, type QuotationFormState } from "@/components/erp/quotation-sheet"
import { formatAttachmentSize, readFileAsStoredAttachment, type StoredFileAttachment } from "@/lib/attachments"
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
import { getPresalesUsers } from "@/lib/admin-data"
import { currentUser } from "@/lib/current-user"
import { type CustomerRecord, getCustomerByCode, getCustomerByName, getOpportunitiesByCustomerName } from "@/lib/finding-data"
import { deleteQuotation, getQuotations, subscribeQuotationUpdates, updateQuotation } from "@/lib/quotation-workflow"
import { loadBackendActivityRecords, updateBackendActivityRecord } from "@/lib/sales-activity-backend"
import { loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import {
  deleteBackendQuotationRecord,
  loadBackendQuotationRecords,
  updateBackendQuotationRecord,
} from "@/lib/sales-quotation-backend"

const fullWidthFieldLabels = ["요청 내용"]
type AttachmentDraft = StoredFileAttachment

export default function ActivityEditPage() {
  const params = useParams<{ category: ActivityCategory; id: string }>()
  const router = useRouter()
  const category = params.category
  const id = params.id
  const presalesUsers = getPresalesUsers()
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([])
  const [requests, setRequests] = useState<ActivityRequestRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [activityAttachments, setActivityAttachments] = useState<AttachmentDraft[]>([])
  const [requestAttachments, setRequestAttachments] = useState<AttachmentDraft[]>([])
  const [activityCustomer, setActivityCustomer] = useState("")
  const [activityCustomerCode, setActivityCustomerCode] = useState("")
  const [activityOpportunity, setActivityOpportunity] = useState("")
  const [activityOpportunityCode, setActivityOpportunityCode] = useState("")
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
    requester: "",
    receiver: "",
    customerCode: "",
    customer: "",
    opportunityCode: "",
    opportunity: "",
    dueDate: "",
    content: "",
  })

  const scrollToTop = () => {
    window.scrollTo(0, 0)
    const scrollContainer = document.querySelector("main")
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0)
    }
  }

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
    if (category === "activities") return activityRecords.find((entry) => entry.id === id) ?? null
    if (category === "quotations") return quotations.find((entry) => entry.id === id) ?? null
    return requests.find((entry) => entry.id === id) ?? null
  }, [activityRecords, category, id, quotations, requests])

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
    setActivityAttachments(activity.attachments ?? [])
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
      requester: request.requester,
      receiver: request.receiver,
      customerCode: normalizedCustomer?.id ?? request.customerCode ?? "",
      customer: normalizedCustomer?.name ?? request.customer,
      opportunityCode: request.opportunityCode ?? "",
      opportunity: request.opportunity,
      dueDate: request.dueDate,
      content: request.content,
    })
    setRequestAttachments(request.attachments ?? [])
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
    const firstOpportunity = customer ? getOpportunitiesByCustomerName(customer.name)[0] : null
    setActivityOpportunity(firstOpportunity?.name ?? (customer ? "미확인" : ""))
    setActivityOpportunityCode(firstOpportunity?.id ?? "")
  }

  const handleActivityOpportunityChange = (value: string) => {
    const opportunity = activityOpportunityOptions.find((entry) => entry.name === value)
    setActivityOpportunity(value)
    setActivityOpportunityCode(value === "미확인" ? "" : opportunity?.id ?? "")
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
        router.push(`/activity/${category}/${id}`)
        return
      } catch {
        const updatedQuotation: QuotationRecord | null = updateQuotation(id, normalized)
        if (!updatedQuotation) return

        scrollToTop()
        toast({
          title: "견적 수정 완료",
          description: `${normalized.customer} 견적서가 수정되었습니다.`,
        })
        router.push(`/activity/${category}/${id}`)
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
      const localRequestId = Number.parseInt((item as ActivityRecord).requestId ?? "", 10)
      const salesActivityRequestId = Number.isNaN(localRequestId) ? undefined : localRequestId

      try {
        const updatedActivity = await updateBackendActivityRecord(id, {
          projectOpportunityId: (item as ActivityRecord).projectOpportunityId,
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
          status: (item as ActivityRecord).status,
          salesActivityRequestId,
        })

        scrollToTop()
        toast({
          title: "영업활동 수정 완료",
          description: `${updatedActivity.customer} 영업활동이 수정되었습니다.`,
        })
        router.push(`/activity/${category}/${id}`)
      } catch {
        scrollToTop()
        toast({
          title: "영업활동 수정 실패",
          description: "백엔드에서 영업활동을 수정하지 못했습니다.",
        })
      }
      return
    }

    if (!canEditRequest) return

    const updated = updateActivityRequest(id, {
      ...requestForm,
      attachments: requestAttachments,
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
        return
      } catch {
        const deleted = deleteQuotation(id)
        if (!deleted) return

        scrollToTop()
        toast({
          title: "견적 삭제 완료",
          description: `${id} 견적서가 삭제되었습니다.`,
        })
        router.push("/activity")
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
                      values={activityForm}
                      onValuesChange={setActivityForm}
                    />
                    <div className="space-y-2">
                      <Label>첨부파일</Label>
                      <Input
                        type="file"
                        multiple
                        onChange={(event) => {
                          void handleAttachmentChange(event.target.files, setActivityAttachments)
                          event.target.value = ""
                        }}
                      />
                      {activityAttachments.length > 0 ? (
                        <div className="space-y-2 rounded-md border border-border p-3">
                          {activityAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="min-w-0 flex-1">
                                <a href={attachment.dataUrl} download={attachment.name} className="truncate text-primary hover:underline">
                                  {attachment.name}
                                </a>
                                <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={() => setActivityAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}>
                                삭제
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Input readOnly value="등록된 첨부파일이 없습니다." />
                      )}
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
                    <div className="space-y-2 md:col-span-2">
                      <Label>첨부파일</Label>
                      <Input
                        type="file"
                        multiple
                        onChange={(event) => {
                          void handleAttachmentChange(event.target.files, setRequestAttachments)
                          event.target.value = ""
                        }}
                      />
                      {requestAttachments.length > 0 ? (
                        <div className="space-y-2 rounded-md border border-border p-3">
                          {requestAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="min-w-0 flex-1">
                                <a href={attachment.dataUrl} download={attachment.name} className="truncate text-primary hover:underline">
                                  {attachment.name}
                                </a>
                                <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={() => setRequestAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}>
                                삭제
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Input readOnly value="등록된 첨부파일이 없습니다." />
                      )}
                    </div>
                  </div>
                ) : quotationForm ? (
                  <QuotationSheet
                    mode="edit"
                    form={quotationForm}
                    referenceId={id}
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
