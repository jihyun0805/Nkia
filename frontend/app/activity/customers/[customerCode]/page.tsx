"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { RfpSummaryMarkdown } from "@/components/erp/rfp-summary-markdown"
import { type ActivityRecord, getActivityDisplayType } from "@/lib/activity-data"
import { formatAttachmentSize } from "@/lib/attachments"
import { loadBackendActivityRecords } from "@/lib/sales-activity-backend"
import { deleteOpportunity, getFindingFields, getOpportunities, getCustomerByCode } from "@/lib/finding-data"
import { loadBackendFindingData } from "@/lib/finding-backend"
import type { CustomerRecord, OpportunityRecord } from "@/lib/finding-data"
import { toast } from "@/hooks/use-toast"
import { FileText, Mail, Phone, Users } from "lucide-react"

const activitiesPerPage = 10
const fullWidthFieldLabels = [
  "주요 사업 내용 및 주요 이슈 내용",
  "경쟁 상황",
  "고객사 의사결정구조 및 담당자 정보",
]

function formatRfpSummaryTitle(fileName: string) {
  const title = fileName.replace(/\.[^.]+$/, "").trim()
  return title || "RFP 문서"
}

export default function ActivityCustomerDetailPage() {
  const params = useParams<{ customerCode: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerCode = params.customerCode
  const opportunityId = searchParams.get("opportunityId") ?? ""
  const [page, setPage] = useState(1)
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([])
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const displayCustomer =
    customer ?? {
      id: customerCode,
      name: customerCode,
      category: "-",
      opportunities: 0,
      contracts: 0,
      contact: "-",
      phone: "-",
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

    loadBackendFindingData()
      .then((data) => {
        if (cancelled) return
        setCustomer(data.customers.find((item) => item.id === customerCode) ?? null)
        setOpportunities(data.opportunities)
      })
      .catch(() => {
        if (cancelled) return
        setCustomer(getCustomerByCode(customerCode))
        setOpportunities(getOpportunities())
      })

    return () => {
      cancelled = true
    }
  }, [customerCode])

  const customerActivities = useMemo(
    () =>
      activityRecords
        .filter((activity) => activity.customerCode === customerCode)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [activityRecords, customerCode],
  )
  const customerOpportunities = useMemo(
    () =>
      opportunities
        .filter((opportunity) => opportunity.customerCode === customerCode)
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt)
          return b.id.localeCompare(a.id)
        }),
    [customerCode, opportunities],
  )
  const selectedOpportunity =
    customerOpportunities.find((opportunity) => opportunity.id === opportunityId) ??
    customerOpportunities[0] ??
    null
  const opportunityFields = selectedOpportunity ? getFindingFields("opportunities", selectedOpportunity) : []

  const handleDeleteOpportunity = () => {
    if (!selectedOpportunity) return

    const result = deleteOpportunity(selectedOpportunity.id)
    if (result.status === "not_found") {
      toast({
        title: "사업기회 삭제 실패",
        description: "삭제할 사업기회를 찾지 못했습니다.",
      })
      setIsDeleteOpen(false)
      return
    }

    toast({
      title: "사업기회 삭제 완료",
      description: `${result.opportunity.name} 사업기회가 삭제되었습니다.`,
    })
    setIsDeleteOpen(false)
  }

  const totalPages = Math.max(1, Math.ceil(customerActivities.length / activitiesPerPage))
  const paginatedActivities = useMemo(() => {
    const startIndex = (page - 1) * activitiesPerPage
    return customerActivities.slice(startIndex, startIndex + activitiesPerPage)
  }, [customerActivities, page])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={`${displayCustomer.name} 활동 현황`} description="고객사 하위의 모든 활동 이력을 최신순으로 확인합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity">활동</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/activity/customers">전체 보기</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{displayCustomer.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">등록된 사업 기회 내용</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOpportunity ? (
                  <>
	                    <div className="grid gap-4 md:grid-cols-2">
	                      {opportunityFields.map((field) => (
	                        <div
	                          key={field.label}
	                          className={`space-y-2 ${fullWidthFieldLabels.includes(field.label) ? "md:col-span-2" : ""}`}
                        >
                          <Label>{field.label}</Label>
                          <Input readOnly value={field.value || "-"} />
	                        </div>
	                      ))}
	                    </div>
	                    <section className="mt-6 space-y-3">
	                      <h2 className="text-base font-semibold">RFP 문서</h2>
	                      {Array.isArray(selectedOpportunity.rfpAttachments) && selectedOpportunity.rfpAttachments.length > 0 ? (
	                        <>
	                          <div className="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
	                            {selectedOpportunity.rfpAttachments.map((attachment) => (
	                              <div key={attachment.id} className="flex items-center gap-2 text-sm">
	                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
	                                <a href={attachment.dataUrl} download={attachment.name} className="truncate font-medium text-primary hover:underline">
	                                  {attachment.name}
	                                </a>
	                                <span className="shrink-0 text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</span>
	                              </div>
	                            ))}
	                          </div>
	                          {selectedOpportunity.rfpAttachments.some((attachment) => attachment.summary) ? (
	                            <div className="space-y-3">
	                              {selectedOpportunity.rfpAttachments.filter((attachment) => attachment.summary).map((attachment) => (
	                                <div key={attachment.id} className="space-y-3 rounded-md border border-border p-4">
	                                  <h3 className="text-sm font-semibold">&lt;{formatRfpSummaryTitle(attachment.name)}&gt; 요약</h3>
	                                  <RfpSummaryMarkdown markdown={attachment.summary} />
	                                </div>
	                              ))}
	                            </div>
	                          ) : null}
	                        </>
	                      ) : (
	                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">등록된 RFP 문서가 없습니다.</div>
	                      )}
	                    </section>
	                    <div className="flex justify-end gap-2 border-t pt-6">
                      <Button variant="outline" asChild>
                        <Link href={`/finding/opportunities/${selectedOpportunity.id}/edit?tab=opportunities`}>수정</Link>
                      </Button>
                      <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                        삭제
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    연결된 사업기회 정보가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">활동 목록</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{displayCustomer.name} / {displayCustomer.id}</p>
                    </div>
                  <Badge variant="secondary">{customerActivities.length}건</Badge>
                  </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[16%]">고객사</TableHead>
                      <TableHead className="w-[24%]">사업기회</TableHead>
                      <TableHead className="w-[100px]">활동일</TableHead>
                      <TableHead className="w-[180px]">활동구분</TableHead>
                      <TableHead className="w-[14%]">등록자</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedActivities.map((activity) => (
                      <TableRow
                        key={activity.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/activity/activities/${activity.id}`)}
                      >
                        <TableCell className="font-medium">{activity.customer}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{activity.opportunity}</TableCell>
                        <TableCell>{activity.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {activity.activityMode === "이메일" && <Mail className="w-3 h-3" />}
                            {activity.activityMode === "전화" && <Phone className="w-3 h-3" />}
                            {activity.activityMode === "대면미팅" && <Users className="w-3 h-3" />}
                            {activity.activityMode === "영상회의" && <Users className="w-3 h-3" />}
                            {getActivityDisplayType(activity)}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.registrant ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {customerActivities.length === 0
                      ? "0건"
                      : `${(page - 1) * activitiesPerPage + 1}-${Math.min(page * activitiesPerPage, customerActivities.length)} / ${customerActivities.length}건`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사업기회를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 등록된 사업기회 내용을 다시 확인할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOpportunity}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
