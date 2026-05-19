"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { UserIdPicker } from "@/components/erp/user-id-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuotationSheet } from "@/components/erp/quotation-sheet"
import { ActivityFormFields } from "@/components/erp/searchable-activity-form-fields"
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
import { toast } from "@/hooks/use-toast"
import { approveBackendWorkflow, loadBackendUsers, rejectBackendWorkflow, type BackendUserSummary } from "@/lib/workflow-backend"
import {
  type ActivityAttachment,
  type ActivityCategory,
  type ActivityRecord,
  type ActivityRequestRecord,
  type QuotationRecord,
  getCategoryLabel,
} from "@/lib/activity-data"
import { approveActivityRequest, getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import { currentUser } from "@/lib/current-user"
import { deleteBackendActivityRecord, loadBackendActivityRecord } from "@/lib/sales-activity-backend"
import { loadBackendActivityRequest, loadBackendActivityRequests } from "@/lib/sales-activity-request-backend"
import {
  deleteBackendQuotationRecord,
  loadBackendQuotationHistoryRecord,
  loadBackendQuotationHistoryRecords,
  loadBackendQuotationRecords,
} from "@/lib/sales-quotation-backend"
import { type CustomerRecord, getCustomerByCode, getCustomerByName, getOpportunitiesByCustomerName } from "@/lib/finding-data"
import {
  approveQuotationStep,
  deleteQuotationVersion,
  getQuotations,
  rejectQuotationStep,
  subscribeQuotationUpdates,
} from "@/lib/quotation-workflow"

function buildQuotationDetailForm(record: QuotationRecord) {
  return {
    refNumber: record.refNumber ?? record.id,
    date: record.date,
    customerCode: record.customerCode ?? "",
    opportunityCode: record.opportunityCode ?? "",
    customer: record.customer,
    opportunity: record.opportunity,
    proposalType: record.proposalType,
    productGroup: record.productGroup,
    salesRep: record.salesRep,
    paymentTerms: record.paymentTerms ?? "현금",
    contactName: record.contactName ?? "",
    items: record.items.map((entry) => ({ ...entry })),
    solutionSectionTitle: record.solutionSectionTitle,
    solutionRows: record.solutionRows?.map((entry) => ({ ...entry })) ?? [],
    customizingSectionTitle: record.customizingSectionTitle,
    customizingRows: record.customizingRows?.map((entry) => ({ ...entry })) ?? [],
    templateText: record.templateText,
    approvalFlow: record.approvalFlow,
    approvalProcess: record.approvalProcess
      ? {
          overallStatus: record.approvalProcess.overallStatus,
          currentStepIndex: record.approvalProcess.currentStepIndex,
          steps: record.approvalProcess.steps.map((step) => ({ ...step })),
        }
      : undefined,
    changeHistory: record.changeHistory?.map((entry) => ({ ...entry })) ?? [],
    versionSnapshots: record.versionSnapshots?.map((entry) => ({
      ...entry,
      form: {
        ...entry.form,
        items: entry.form.items.map((item) => ({ ...item })),
        solutionRows: entry.form.solutionRows?.map((row) => ({ ...row })) ?? [],
        customizingRows: entry.form.customizingRows?.map((row) => ({ ...row })) ?? [],
        approvalFlow: entry.form.approvalFlow ? { ...entry.form.approvalFlow } : undefined,
      },
    })) ?? [],
    remarks: record.remarks ?? "",
    amount: record.amount,
    validity: record.validity,
    status: record.status,
  }
}

export default function ActivityDetailPage() {
  const params = useParams<{ category: ActivityCategory; id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = params.category
  const id = params.id
  const historyRefreshToken = searchParams.get("historyRefresh") ?? ""
  const [activityRecord, setActivityRecord] = useState<ActivityRecord | null | undefined>(undefined)
  const [requests, setRequests] = useState<ActivityRequestRecord[]>([])
  const [requestDetail, setRequestDetail] = useState<ActivityRequestRecord | null | undefined>(undefined)
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [isRequestsLoaded, setIsRequestsLoaded] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isActivityDeleteDialogOpen, setIsActivityDeleteDialogOpen] = useState(false)
  const [isVersionDeleteDialogOpen, setIsVersionDeleteDialogOpen] = useState(false)
  const [versionDeleteTarget, setVersionDeleteTarget] = useState<string>("")
  const [quotationDetailTab, setQuotationDetailTab] = useState("document")
  const [workflowUsers, setWorkflowUsers] = useState<BackendUserSummary[]>([])
  const [nextApproverId, setNextApproverId] = useState("")
  const [quotationHistoryRecords, setQuotationHistoryRecords] = useState<
    { id: number; version: number; quotationCode: string; quotationDate: string }[]
  >([])
  const [selectedQuotationHistoryKey, setSelectedQuotationHistoryKey] = useState<string | null>(null)
  const [selectedQuotationHistoryDetail, setSelectedQuotationHistoryDetail] = useState<QuotationRecord | null>(null)

  const scrollToTop = () => {
    window.scrollTo(0, 0)
    const scrollContainer = document.querySelector("main")
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0)
    }
  }

  useEffect(() => {
    if (category !== "activities") return

    let cancelled = false

    setActivityRecord(undefined)

    loadBackendActivityRecord(id)
      .then((record) => {
        if (!cancelled) {
          setActivityRecord(record)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivityRecord(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [category, id])

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
          setIsRequestsLoaded(true)
        }
      })
      .catch(() => {
        sync()
        if (!cancelled) {
          setIsRequestsLoaded(true)
        }
      })

    const unsubscribe = subscribeWorkflowUpdates(sync)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void loadBackendUsers()
      .then((users) => {
        if (!cancelled) {
          setWorkflowUsers(Array.isArray(users) ? users : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkflowUsers([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (category !== "requests") return

    let cancelled = false
    setRequestDetail(undefined)

    const requestId = Number(id)
    if (Number.isNaN(requestId)) {
      setRequestDetail(null)
      return
    }

    loadBackendActivityRequest(requestId)
      .then((request) => {
        if (!cancelled) {
          setRequestDetail(request)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequestDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [category, id])

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
    if (category === "activities") return activityRecord ?? null
    if (category === "quotations") return quotations.find((entry) => entry.id === id) ?? null
    return requestDetail ?? requests.find((entry) => entry.id === id) ?? null
  }, [activityRecord, category, id, quotations, requests, requestDetail])
  const categoryLabel = getCategoryLabel(category)
  const isRequest = category === "requests"
  const isQuotation = category === "quotations"
  const requestItem = isRequest && item ? (item as ActivityRequestRecord) : null
  const quotationItem = isQuotation && item ? (item as QuotationRecord) : null
  const isViewingQuotationHistoryDetail = Boolean(selectedQuotationHistoryDetail)
  const requestMatchedCustomer = requestItem ? getCustomerByName(requestItem.customer) : null
  const isDeletedQuotation = Boolean(quotationItem?.deletedAt)
  const quotationApprovalProcess =
    quotationItem?.approvalProcess ?? {
      overallStatus: "진행중" as const,
      currentStepIndex: 0,
      steps: [
        { label: "상신자", assignee: quotationItem?.salesRep ?? currentUser.name, status: "pending" as const },
        { label: "팀장", assignee: "팀장", status: "pending" as const },
        { label: "본부장", assignee: "본부장", status: "pending" as const },
        { label: "사업본부장", assignee: "사업본부장", status: "pending" as const },
        { label: "경영지원팀장", assignee: "경영지원팀장", status: "pending" as const },
        { label: "대표이사", assignee: "대표이사", status: "pending" as const },
      ],
    }
  useEffect(() => {
    setNextApproverId("")
  }, [quotationItem?.backendId, historyRefreshToken])
  useEffect(() => {
    let cancelled = false

    const quotationId = quotationItem?.backendId
    if (!quotationItem || quotationId == null) {
      setQuotationHistoryRecords([])
      setSelectedQuotationHistoryKey(null)
      setSelectedQuotationHistoryDetail(null)
      return () => {
        cancelled = true
      }
    }

    setQuotationHistoryRecords([])
    setSelectedQuotationHistoryKey(null)
    setSelectedQuotationHistoryDetail(null)

    void loadBackendQuotationHistoryRecords(quotationId)
      .then((records) => {
        if (cancelled) return
        setQuotationHistoryRecords(
          records
            .filter((record): record is { id: number; version: number; quotationCode: string; quotationDate: string } => {
              return typeof record.id === "number" && typeof record.version === "number"
            })
            .sort((a, b) => b.version - a.version),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setQuotationHistoryRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [quotationItem?.backendId, historyRefreshToken])

  useEffect(() => {
    if (!historyRefreshToken) return
    if (quotationHistoryRecords.length > 0) {
      setQuotationDetailTab("history")
      setSelectedQuotationHistoryKey(`backend:${quotationHistoryRecords[0].id}`)
    }
  }, [historyRefreshToken, quotationHistoryRecords, quotationItem])

  useEffect(() => {
    let cancelled = false

    const quotationId = quotationItem?.backendId
    if (!quotationItem || quotationId == null || selectedQuotationHistoryKey == null) {
      setSelectedQuotationHistoryDetail(null)
      return () => {
        cancelled = true
      }
    }

    if (!selectedQuotationHistoryKey.startsWith("backend:")) {
      return () => {
        cancelled = true
      }
    }

    const historyId = Number(selectedQuotationHistoryKey.replace("backend:", ""))
    if (Number.isNaN(historyId)) {
      return () => {
        cancelled = true
      }
    }

    void loadBackendQuotationHistoryRecord(historyId)
      .then((record) => {
        if (!cancelled) {
          setSelectedQuotationHistoryDetail(record)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedQuotationHistoryDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [quotationItem?.backendId, selectedQuotationHistoryKey, quotationItem])
  const activeApprovalStep = quotationApprovalProcess.steps[quotationApprovalProcess.currentStepIndex] ?? null
  const approvalSteps = quotationApprovalProcess.steps.slice(0, quotationApprovalProcess.currentStepIndex + 1)
  type WorkflowUserOption = BackendUserSummary & { id: string; name: string }

  const nextApproverOptions = workflowUsers.filter((user): user is WorkflowUserOption => {
    const id = user.id?.trim()
    const name = user.name?.trim()
    return Boolean(id && name && id !== currentUser.id)
  })
  const selectedNextApprover = nextApproverOptions.find((user) => user.id === nextApproverId) ?? null
  const quotationHistoryRows =
    quotationHistoryRecords.map((record) => ({
      key: `backend:${record.id}`,
      versionLabel: `v${record.version}`,
      quotationDate: record.quotationDate,
      quotationCode: record.quotationCode,
      historyId: record.id,
    }))
  const canActOnApprovalStep =
    Boolean(quotationItem) &&
    quotationApprovalProcess.overallStatus === "진행중" &&
    Boolean(activeApprovalStep) &&
    (activeApprovalStep.assignee === currentUser.name || activeApprovalStep.assignee === currentUser.role)
  const detailFieldClassName = "text-foreground disabled:opacity-100 disabled:text-foreground"
  const listHref =
    item && category === "activities"
      ? `/activity/customers/${(item as { customerCode?: string }).customerCode ?? ""}`
      : "/activity"

  const handleApprove = () => {
    const approved = approveActivityRequest(id)
    if (!approved) return

    const approvedRequest = approved as ActivityRequestRecord

    toast({
      title: "접수 완료",
      description: `${approvedRequest.requester} 요청자에게 승인 알림을 전송했습니다.`,
    })
  }

  const handleDeleteQuotation = () => {
    scrollToTop()
    void (async () => {
      try {
        await deleteBackendQuotationRecord(id)
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

  const handleDeleteActivity = () => {
    if (!item || category !== "activities") return

    scrollToTop()
    void (async () => {
      try {
        await deleteBackendActivityRecord(id)
        toast({
          title: "영업활동 삭제 완료",
          description: `${id} 영업활동이 삭제되었습니다.`,
        })
        router.push(listHref)
      } catch (error) {
        toast({
          title: "영업활동 삭제 실패",
          description: error instanceof Error ? error.message : "백엔드에서 영업활동을 삭제하지 못했습니다.",
        })
      }
    })()
  }

  const handleDeleteQuotationVersion = () => {
    if (!quotationItem || !versionDeleteTarget) return

    scrollToTop()

    const updated = deleteQuotationVersion(quotationItem.id, versionDeleteTarget)
    if (!updated) return

    toast({
      title: "버전 삭제 완료",
      description: `${versionDeleteTarget} 버전이 삭제됨으로 표시되었습니다.`,
    })
    setIsVersionDeleteDialogOpen(false)
    setVersionDeleteTarget("")
  }

  const handleApproveQuotation = () => {
    if (!quotationItem || !canActOnApprovalStep) return
    if (!selectedNextApprover) {
      toast({
        title: "다음 승인자 선택 필요",
        description: "승인 요청을 보낼 다음 사용자를 먼저 선택해 주세요.",
      })
      return
    }

    scrollToTop()
    void (async () => {
      try {
        if (quotationItem.workflowId) {
          await approveBackendWorkflow(quotationItem.workflowId, {
            nextApproverId: selectedNextApprover.id,
          })
        }

        const updated = approveQuotationStep(quotationItem.id, {
          id: selectedNextApprover.id,
          name: selectedNextApprover.name,
        })
        if (!updated) return

        toast({
          title: "견적 승인 완료",
          description: `${activeApprovalStep?.label ?? "현재 단계"} 승인이 처리되어 ${selectedNextApprover.name}(${selectedNextApprover.id})에게 요청했습니다.`,
        })
        setNextApproverId("")
      } catch (error) {
        toast({
          title: "견적 승인 실패",
          description: error instanceof Error ? error.message : "백엔드 결재를 처리하지 못했습니다.",
        })
      }
    })()
  }

  const handleRejectQuotation = () => {
    if (!quotationItem || !canActOnApprovalStep) return

    scrollToTop()
    void (async () => {
      try {
        if (quotationItem.workflowId) {
          await rejectBackendWorkflow(quotationItem.workflowId)
        }

        const updated = rejectQuotationStep(quotationItem.id)
        if (!updated) return

        toast({
          title: "견적 반려 완료",
          description: `${activeApprovalStep?.label ?? "현재 단계"} 반려가 처리되었습니다.`,
        })
      } catch (error) {
        toast({
          title: "견적 반려 실패",
          description: error instanceof Error ? error.message : "백엔드 결재를 처리하지 못했습니다.",
        })
      }
    })()
  }

  const handleOpenQuotationDelete = () => {
    if (!quotationItem) return

    scrollToTop()

    setIsDeleteDialogOpen(true)
  }

  if (category === "activities" && activityRecord === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${categoryLabel} 상세`} description={`${categoryLabel} 건을 페이지에서 확인합니다`} />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto flex max-w-6xl items-center justify-center py-24 text-sm text-muted-foreground">
              영업활동 상세를 불러오는 중입니다.
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (category === "requests" && requestDetail === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${categoryLabel} 상세`} description={`${categoryLabel} 건을 페이지에서 확인합니다`} />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto flex max-w-6xl items-center justify-center py-24 text-sm text-muted-foreground">
              활동요청 상세를 불러오는 중입니다.
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title={`${categoryLabel} 상세`} description={`${categoryLabel} 건을 페이지에서 확인합니다`} />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto flex max-w-6xl items-center justify-center py-24 text-sm text-muted-foreground">
              {category === "requests" ? "활동요청 정보를 찾을 수 없습니다." : `${categoryLabel} 정보를 찾을 수 없습니다.`}
            </div>
          </main>
        </div>
      </div>
    )
  }

  const quotationBreadcrumbValue = quotationItem?.refNumber?.trim() || item.id

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header
          title={`${categoryLabel} 상세`}
          description={`${categoryLabel} 건을 페이지에서 확인합니다`}
        />

        <main className="flex-1 overflow-auto p-6">
          <div className={`mx-auto space-y-6 ${isQuotation ? "max-w-[1440px]" : "max-w-6xl"}`}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity">활동</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{isQuotation ? quotationBreadcrumbValue : item.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader>
                <CardTitle>{categoryLabel} 상세</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isQuotation && quotationItem ? (
                  <Tabs value={quotationDetailTab} onValueChange={setQuotationDetailTab} className="space-y-6">
                    <TabsList>
                      <TabsTrigger value="document">견적서</TabsTrigger>
                      <TabsTrigger value="approval">결재 프로세스</TabsTrigger>
                      <TabsTrigger value="history">변경 이력</TabsTrigger>
                    </TabsList>
                    <TabsContent value="document" className="mt-0">
                      <div className="space-y-3">
                        {isViewingQuotationHistoryDetail && (
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                setSelectedQuotationHistoryKey(null)
                                setSelectedQuotationHistoryDetail(null)
                              }}
                                >
                              현재 버전 보기
                            </Button>
                          </div>
                        )}
                        <QuotationSheet
                          mode="detail"
                          form={
                            selectedQuotationHistoryDetail
                              ? buildQuotationDetailForm(selectedQuotationHistoryDetail)
                              : buildQuotationDetailForm(quotationItem)
                          }
                          referenceId={quotationItem.id}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="approval" className="mt-0">
                      <div className="space-y-6 rounded-lg border p-6">
                        <div className="flex flex-wrap items-center gap-3">
                          {approvalSteps.map((step, index) => {
                            const isCurrent = index === quotationApprovalProcess.currentStepIndex
                            const isDone = index < quotationApprovalProcess.currentStepIndex
                            const isRejected =
                              quotationApprovalProcess.overallStatus === "반려" && isCurrent && step.status === "rejected"

                            return (
                              <div key={`${step.label}-${index}`} className="flex items-center gap-3">
                                <div
                                  className={[
                                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                                    isRejected
                                      ? "bg-red-600 text-white"
                                      : isDone
                                        ? "bg-green-100 text-green-700"
                                        : isCurrent
                                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
                                          : "bg-slate-100 text-slate-500",
                                  ].join(" ")}
                                >
                                  {step.label}
                                </div>
                                {index < approvalSteps.length - 1 && (
                                  <span className="text-2xl text-muted-foreground">→</span>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>현재 단계</Label>
                            <Input readOnly value={activeApprovalStep?.label ?? "-"} />
                          </div>
                          <div className="space-y-2">
                            <Label>담당자</Label>
                            <Input readOnly value={activeApprovalStep?.assignee ?? "-"} />
                          </div>
                          <div className="space-y-2">
                            <Label>결재 상태</Label>
                            <Input readOnly value={quotationApprovalProcess.overallStatus} />
                          </div>
                          <div className="space-y-2">
                            <Label>다음 승인자</Label>
                            <UserIdPicker
                              value={nextApproverId}
                              users={nextApproverOptions}
                              onValueChange={setNextApproverId}
                              placeholder={
                                nextApproverOptions.length > 0 ? "다음 승인자를 선택하세요" : "선택 가능한 사용자가 없습니다"
                              }
                              disabled={!canActOnApprovalStep || quotationApprovalProcess.overallStatus !== "진행중"}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>내부 처리</Label>
                            <Input
                              readOnly
                              value={
                                canActOnApprovalStep
                                  ? selectedNextApprover
                                    ? `${currentUser.name} 님이 승인하면 ${selectedNextApprover.name}(${selectedNextApprover.id})에게 결재 요청을 보냅니다.`
                                    : `${currentUser.name} 님이 승인/반려를 처리할 수 있습니다. 다음 승인자를 선택해 주세요.`
                                  : "현재 단계 담당자만 승인/반려할 수 있습니다."
                              }
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            disabled={!canActOnApprovalStep || quotationApprovalProcess.overallStatus !== "진행중"}
                            onClick={handleRejectQuotation}
                          >
                            반려
                          </Button>
                          <Button
                            className="bg-primary hover:bg-primary/90"
                            disabled={
                              !canActOnApprovalStep ||
                              quotationApprovalProcess.overallStatus !== "진행중" ||
                              !selectedNextApprover
                            }
                            onClick={handleApproveQuotation}
                          >
                            승인 후 요청
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="history" className="mt-0">
                      <div className="rounded-lg border">
                        <table className="w-full table-fixed border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-center font-semibold">
                              <th className="border-b border-r px-3 py-3">버전</th>
                              <th className="border-b border-r px-3 py-3">견적일자</th>
                              <th className="border-b border-r px-3 py-3">견적서코드</th>
                              <th className="border-b px-3 py-3">보기</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotationHistoryRows.length > 0 ? (
                              quotationHistoryRows.map((entry) => (
                                <tr key={entry.key}>
                                  <td className="border-r border-t px-3 py-3 text-center">{entry.versionLabel}</td>
                                  <td className="border-r border-t px-3 py-3 text-center">{entry.quotationDate}</td>
                                  <td className="border-r border-t px-3 py-3 text-center">{entry.quotationCode}</td>
                                  <td className="border-t px-3 py-3 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        scrollToTop()
                                        setSelectedQuotationHistoryKey(entry.key)
                                        setQuotationDetailTab("document")
                                      }}
                                    >
                                      보기
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                                  변경 이력이 없습니다.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : isRequest && requestItem ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>요청일</Label>
                        <Input type="date" value={requestItem.date} readOnly disabled className={detailFieldClassName} />
                      </div>
                      <div className="space-y-2">
                        <Label>요청 유형</Label>
                        <Select value={requestItem.type} disabled>
                          <SelectTrigger className={detailFieldClassName}>
                            <SelectValue placeholder="요청 유형을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {requestItem.type ? (
                              <SelectItem value={requestItem.type}>{requestItem.type}</SelectItem>
                            ) : null}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>요청 제목</Label>
                      <Input value={requestItem.title ?? "-"} readOnly disabled className={detailFieldClassName} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>요청자</Label>
                        <Input value={requestItem.requester} readOnly disabled className={detailFieldClassName} />
                      </div>
                      <div className="space-y-2">
                        <Label>담당자</Label>
                        <Input value={requestItem.receiver} readOnly disabled className={detailFieldClassName} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>고객사</Label>
                        <Input value={requestMatchedCustomer?.name ?? requestItem.customer} readOnly disabled className={detailFieldClassName} />
                      </div>
                      <div className="space-y-2">
                        <Label>사업기회</Label>
                        <Input
                          value={requestItem.opportunity || "미확인"}
                          readOnly
                          disabled={!requestMatchedCustomer}
                          className={detailFieldClassName}
                          placeholder="고객사를 먼저 선택하세요"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>활동일</Label>
                        <Input type="date" value={requestItem.dueDate} readOnly disabled className={detailFieldClassName} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>요청 내용</Label>
                      <Textarea rows={4} value={requestItem.content} readOnly disabled className={detailFieldClassName} />
                    </div>
                    {requestItem.approvedAt && (
                      <div className="space-y-2 md:w-1/2">
                        <Label>승인일</Label>
                        <Input readOnly value={requestItem.approvedAt} disabled className={detailFieldClassName} />
                      </div>
                    )}
                  </div>
                ) : (
                  <ActivityFormFields
                    defaultValues={item as ActivityRecord}
                    readOnly
                  />
                )}

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href={listHref}>목록</Link>
                  </Button>
                  {requestItem &&
                    (requestItem.salesActivityId ? (
                      <Button variant="outline" asChild>
                        <Link href={`/activity/activities/${requestItem.salesActivityId}`}>활동 보기</Link>
                      </Button>
                    ) : (
                      <Button variant="outline" asChild>
                        <Link href={`/activity/new/activities?requestId=${id}`}>활동 등록</Link>
                      </Button>
                    ))}
                  {requestItem && requestItem.type === "RFP 분석" && requestItem.receiver === currentUser.name && (
                    <Button asChild className="bg-red-600 hover:bg-red-700">
                      <Link href={`/bid/new/rfp?requestId=${id}`}>RFP 분석 실행</Link>
                    </Button>
                  )}
                  {requestItem && requestItem.status !== "접수완료" && requestItem.receiver === currentUser.name && (
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                      승인(접수)
                    </Button>
                  )}
                  {isQuotation && quotationDetailTab === "document" && !isViewingQuotationHistoryDetail && !isDeletedQuotation && (
                    <Button variant="destructive" onClick={handleOpenQuotationDelete}>
                      삭제
                    </Button>
                  )}
                  {!isRequest &&
                    (!isQuotation || (quotationDetailTab === "document" && !isViewingQuotationHistoryDetail && !isDeletedQuotation)) && (
                    <Button asChild className="bg-primary hover:bg-primary/90">
                      <Link href={`/activity/${category}/${id}/edit`} onClick={scrollToTop}>
                        수정
                      </Link>
                    </Button>
                  )}
                  {category === "activities" && (
                    <Button variant="destructive" onClick={() => setIsActivityDeleteDialogOpen(true)}>
                      삭제
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
              삭제 후에는 목록에서 제외되고, 변경 이력에는 전체삭제 기록이 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuotation}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isActivityDeleteDialogOpen} onOpenChange={setIsActivityDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>영업활동을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 목록과 상세 화면에서 해당 영업활동을 다시 확인할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivity}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isVersionDeleteDialogOpen} onOpenChange={setIsVersionDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>버전 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {versionDeleteTarget} 버전을 삭제됨으로 표시합니다. 버전 스냅샷은 유지되고 변경 이력에서 삭제 상태로 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuotationVersion}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
