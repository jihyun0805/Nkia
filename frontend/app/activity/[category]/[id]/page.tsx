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
import { approveBackendWorkflow, loadBackendUsers, rejectBackendWorkflow, resolveWorkflowApproverId } from "@/lib/workflow-backend"
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
import { deleteBackendQuotationRecord, loadBackendQuotationRecords } from "@/lib/sales-quotation-backend"
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
  const router = useRouter()
  const category = params.category
  const id = params.id
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
  const [selectedQuotationVersion, setSelectedQuotationVersion] = useState("")

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
  const quotationVersions =
    quotationItem?.versionSnapshots
      ?.map((snapshot) => ({
        key: snapshot.version,
        label: snapshot.version,
        capturedAt: snapshot.capturedAt,
        form: {
          ...snapshot.form,
          changeHistory: quotationItem.changeHistory?.map((entry) => ({ ...entry })) ?? [],
          versionSnapshots: [],
        },
      }))
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)) ?? []
  const quotationHistoryRows =
    quotationItem?.versionSnapshots
      ?.map((snapshot) => {
        const versionEntries = quotationItem.changeHistory?.filter((entry) => entry.version === snapshot.version) ?? []
        const versionHistory = versionEntries.length > 0 ? versionEntries[versionEntries.length - 1] : null
        const isDeleted = quotationItem.deletedVersions?.includes(snapshot.version) ?? false
        const latestAction = versionHistory?.action ?? "created"

        return {
          version: snapshot.version,
          changedAt: versionHistory?.changedAt ?? snapshot.capturedAt,
          changedBy: versionHistory?.changedBy ?? quotationItem.salesRep,
          action: isDeleted ? "deleted" : latestAction,
          summary:
            versionHistory?.summary ??
            (isDeleted ? `${snapshot.version} 삭제` : `견적서 ${snapshot.version} 버전`),
          deleted: isDeleted,
        }
      })
      .concat(
        quotationItem?.deletedAt
          ? [
              {
                version: "전체삭제",
                changedAt: quotationItem.deletedAt,
                changedBy: quotationItem.deletedBy ?? quotationItem.salesRep,
                action: "deleted" as const,
                summary: "견적서 전체삭제",
                deleted: true,
              },
            ]
          : [],
      )
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt)) ?? []
  const selectedQuotationVersionDeleted =
    Boolean(selectedQuotationVersion) && (quotationItem?.deletedVersions?.includes(selectedQuotationVersion) ?? false)
  const activeApprovalStep = quotationApprovalProcess.steps[quotationApprovalProcess.currentStepIndex] ?? null
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

    scrollToTop()
    void (async () => {
      try {
        if (quotationItem.workflowId) {
          const users = await loadBackendUsers()
          const nextStep = quotationApprovalProcess.steps[quotationApprovalProcess.currentStepIndex + 1] ?? null
          const nextApproverId = nextStep ? resolveWorkflowApproverId(nextStep.assignee, users) : null

          await approveBackendWorkflow(quotationItem.workflowId, {
            nextApproverId,
          })
        }

        const updated = approveQuotationStep(quotationItem.id)
        if (!updated) return

        toast({
          title: "견적 승인 완료",
          description: `${activeApprovalStep?.label ?? "현재 단계"} 승인이 처리되었습니다.`,
        })
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

    if (quotationDetailTab === "document" && selectedQuotationVersion) {
      setVersionDeleteTarget(selectedQuotationVersion)
      setIsVersionDeleteDialogOpen(true)
      return
    }

    setIsDeleteDialogOpen(true)
  }

  useEffect(() => {
    if (!quotationVersions.length) {
      setSelectedQuotationVersion("")
      return
    }

    if (!quotationVersions.some((version) => version.key === selectedQuotationVersion)) {
      setSelectedQuotationVersion(quotationVersions[0].key)
    }
  }, [quotationVersions, selectedQuotationVersion])

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

  const quotationBreadcrumbValue = quotationItem?.refNumber?.trim() || quotationItem?.quotationCode?.trim() || item.id

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
                      <QuotationSheet
                        mode="detail"
                        form={
                          quotationVersions.find((version) => version.key === selectedQuotationVersion)?.form ??
                          buildQuotationDetailForm(quotationItem)
                        }
                        referenceId={quotationItem.id}
                      />
                    </TabsContent>
                    <TabsContent value="approval" className="mt-0">
                      <div className="space-y-6 rounded-lg border p-6">
                        <div className="flex flex-wrap items-center gap-3">
                          {quotationApprovalProcess.steps.map((step, index) => {
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
                                {index < quotationApprovalProcess.steps.length - 1 && (
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
                            <Label>내부 처리</Label>
                            <Input
                              readOnly
                              value={
                                canActOnApprovalStep
                                  ? `${currentUser.name} 님이 현재 단계 승인/반려를 처리할 수 있습니다.`
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
                            disabled={!canActOnApprovalStep || quotationApprovalProcess.overallStatus !== "진행중"}
                            onClick={handleApproveQuotation}
                          >
                            승인
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
                              <th className="border-b border-r px-3 py-3">변경일시</th>
                              <th className="border-b border-r px-3 py-3">변경자</th>
                              <th className="border-b border-r px-3 py-3">상태</th>
                              <th className="border-b border-r px-3 py-3">내용</th>
                              <th className="border-b px-3 py-3">보기</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotationHistoryRows.length > 0 ? (
                              quotationHistoryRows.map((entry, index) => (
                                <tr key={`${entry.version}-${entry.changedAt}-${index}`}>
                                  <td className="border-r border-t px-3 py-3 text-center">
                                    <div className="space-y-1">
                                      <div>{entry.version}</div>
                                      {entry.deleted && <div className="text-xs font-medium text-red-600">삭제됨</div>}
                                    </div>
                                  </td>
                                  <td className="border-r border-t px-3 py-3 text-center">{entry.changedAt}</td>
                                  <td className="border-r border-t px-3 py-3 text-center">{entry.changedBy}</td>
                                  <td className="border-r border-t px-3 py-3 text-center">
                                    {entry.action === "created" ? "등록" : entry.action === "updated" ? "수정" : "삭제됨"}
                                  </td>
                                  <td className="border-r border-t px-3 py-3">{entry.summary}</td>
                                  <td className="border-t px-3 py-3 text-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        scrollToTop()
                                        setSelectedQuotationVersion(entry.version)
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
                                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                                  아직 변경 이력이 없습니다.
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
                  {isQuotation && quotationDetailTab === "document" && !selectedQuotationVersionDeleted && !isDeletedQuotation && (
                    <Button variant="destructive" onClick={handleOpenQuotationDelete}>
                      삭제
                    </Button>
                  )}
                  {!isRequest &&
                    (!isQuotation || (quotationDetailTab === "document" && !selectedQuotationVersionDeleted && !isDeletedQuotation)) && (
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
