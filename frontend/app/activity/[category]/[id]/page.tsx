"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { WorkflowApprovalPanel } from "@/components/erp/workflow-approval-panel"
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
import {
  type ActivityAttachment,
  type ActivityCategory,
  type ActivityRecord,
  type ActivityRequestRecord,
  type QuotationRecord,
  getCategoryLabel,
} from "@/lib/activity-data"
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
import { deleteQuotationVersion } from "@/lib/quotation-workflow"

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
  const [quotationRefreshKey, setQuotationRefreshKey] = useState(0)
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

useEffect(() => {    if (category !== "activities") return

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

    loadBackendActivityRequests()
      .then((items) => {
        if (!cancelled) {
          setRequests(items)
          setIsRequestsLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequests([])
          setIsRequestsLoaded(true)
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

    loadBackendQuotationRecords()
      .then((records) => {
        if (!cancelled) {
          setQuotations(records)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuotations([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [quotationRefreshKey])

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
  const requestMatchedCustomer =
    requestItem
      ? (requestItem.customerCode ? getCustomerByCode(requestItem.customerCode) : null) ?? getCustomerByName(requestItem.customer)
      : null

  const isDeletedQuotation = Boolean(quotationItem?.deletedAt)

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
  const quotationHistoryRows =
    quotationHistoryRecords.map((record) => ({
      key: `backend:${record.id}`,
      versionLabel: `v${record.version}`,
      quotationDate: record.quotationDate,
      quotationCode: record.quotationCode,
      historyId: record.id,
    }))
  const detailFieldClassName = "text-foreground disabled:opacity-100 disabled:text-foreground"
  const listHref =
    item && category === "activities"
      ? `/activity/customers/${(item as { customerCode?: string }).customerCode ?? ""}`
      : "/activity"

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
                    <div className="px-3 py-1 rounded-md bg-muted text-sm font-medium">
                      {quotationItem?.status ?? "결재 대기"}
                    </div>   
                    <TabsList>
                      <TabsTrigger value="document">견적서</TabsTrigger>
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
                        {!isViewingQuotationHistoryDetail && !isDeletedQuotation && quotationItem.backendId != null && (
                          <WorkflowApprovalPanel
                            workflowId={quotationItem.workflowId}
                            status={quotationItem.status}
                            targetId={quotationItem.backendId}
                            domainType="QUOTATION"
                            onRefresh={() => setQuotationRefreshKey((key) => key + 1)}
                          />
                        )}
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
                    requestTitle={(item as ActivityRecord).salesActivityRequestTitle ?? ""}
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
                  {isQuotation && quotationDetailTab === "document" && !isViewingQuotationHistoryDetail && !isDeletedQuotation && (
                    <Button variant="destructive" onClick={handleOpenQuotationDelete}>
                      삭제
                    </Button>
                  )}
                  {!isRequest &&
                    (!isQuotation ||
                      (quotationDetailTab === "document" &&
                        !isViewingQuotationHistoryDetail &&
                        !isDeletedQuotation)) && (
                      <>
                        <Button asChild className="bg-primary hover:bg-primary/90">
                          <Link href={`/activity/${category}/${id}/edit`} onClick={scrollToTop}>
                            수정
                          </Link>
                        </Button>

                      </>
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
