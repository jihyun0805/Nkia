"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/erp/header"
import { Sidebar } from "@/components/erp/sidebar"
import { WorkflowApprovalPanel } from "@/components/erp/workflow-approval-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { deleteBackendBidResult, loadBackendBidResultDetailById, loadBackendBidResultHistoryRecord, loadBackendBidResultHistoryRecords } from "@/lib/bid-result-backend"
import { type BidResultRecord } from "@/lib/bid-data"
import { toast } from "@/hooks/use-toast"

function BidResultDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input readOnly value={value || "-"} />
    </div>
  )
}

function formatWorkflowStatus(value?: string) {
  const normalized = value?.trim().toUpperCase()
  if (normalized === "DRAFT" || value === "결재 대기" || !value) return "결재 대기"
  if (normalized === "PENDING" || value === "결재중") return "결재중"
  if (normalized === "APPROVED" || value === "승인 완료") return "승인 완료"
  if (normalized === "REJECTED" || value === "반려") return "반려"
  return value ?? "결재 대기"
}

export function BidResultDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const [bidResult, setBidResult] = useState<BidResultRecord | null>(null)
  const [historyRecords, setHistoryRecords] = useState<Array<{ historyId?: number; version?: number; bidResultId?: number; bidOutcome?: string; createdAt?: string }>>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<BidResultRecord | null>(null)
  const [detailTab, setDetailTab] = useState("document")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    void loadBackendBidResultDetailById(id)
      .then((record) => {
        if (!cancelled) {
          setBidResult(record)
          setSelectedHistoryId(null)
          setSelectedHistoryDetail(null)
          setDetailTab("document")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBidResult(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    if (!id) {
      setHistoryRecords([])
      return () => {
        cancelled = true
      }
    }

    void loadBackendBidResultHistoryRecords(id)
      .then((records) => {
        if (cancelled) return
        setHistoryRecords(
          records
            .filter((record): record is typeof record & { historyId: number; version: number } =>
              typeof record.historyId === "number" && typeof record.version === "number",
            )
            .sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRecords([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    if (selectedHistoryId == null) {
      setSelectedHistoryDetail(null)
      setDetailTab("document")
      return () => {
        cancelled = true
      }
    }

    void loadBackendBidResultHistoryRecord(selectedHistoryId)
      .then((record) => {
        if (!cancelled) {
          setSelectedHistoryDetail(record)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedHistoryDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedHistoryId])

  const currentRecord = selectedHistoryDetail ?? bidResult
  const currentWorkflowStatus = formatWorkflowStatus(currentRecord?.workflowStatus)
  const historyRows = useMemo(
    () =>
      historyRecords.map((item) => ({
        key: `backend:${item.historyId}`,
        historyId: item.historyId,
        versionLabel: `v${item.version ?? ""}`,
        documentDate: (item.createdAt ?? "").slice(0, 10),
        documentCode: item.bidResultId != null ? String(item.bidResultId) : String(item.historyId ?? ""),
      })),
    [historyRecords],
  )

  const handleDelete = async () => {
    try {
      await deleteBackendBidResult(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : "삭제할 입찰 결과를 찾지 못했습니다."
      toast({
        title: "입찰 결과 삭제 실패",
        description: message,
      })
      setIsDeleteOpen(false)
      return
    }

    toast({
      title: "입찰 결과 삭제 완료",
      description: `${id} 입찰 결과가 삭제되었습니다.`,
    })
    setIsDeleteOpen(false)
    router.push("/bid")
  }

  if (!bidResult) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="입찰 결과 상세" description="입찰 결과 정보를 조회합니다" />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-5xl">
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  입찰 결과 정보를 찾을 수 없습니다.
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="입찰 결과 상세" description="견적서와 같은 방식으로 결재 프로세스와 변경 이력을 확인합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/bid">입찰</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="border-b">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold tracking-tight">{currentRecord?.opportunity}</CardTitle>
                  <p className="text-sm text-muted-foreground">{currentRecord?.id}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-4 md:p-6">
                <section className="grid gap-4 md:grid-cols-2">
                  <BidResultDetailField label="입찰 결과 코드" value={currentRecord?.id ?? ""} />
                  <BidResultDetailField label="제안서 코드" value={currentRecord?.proposalId ?? ""} />
                  <BidResultDetailField label="고객사" value={currentRecord?.customer ?? ""} />
                  <BidResultDetailField label="사업명" value={currentRecord?.opportunity ?? ""} />
                  <BidResultDetailField label="제안형태" value={currentRecord?.proposalType ?? ""} />
                  <BidResultDetailField label="제품군" value={currentRecord?.productGroup ?? ""} />
                  <BidResultDetailField label="제안서 마감일" value={currentRecord?.proposalDeadline ?? ""} />
                  <BidResultDetailField label="입찰 결과" value={currentRecord?.result ?? ""} />
                  <BidResultDetailField label="영업대표" value={currentRecord?.salesRep ?? ""} />
                  <BidResultDetailField label="상태" value={currentRecord?.workflowStatus ?? currentRecord?.result ?? ""} />
                  <BidResultDetailField label="입찰일" value={currentRecord?.bidDate ?? ""} />
                  <BidResultDetailField label="금액" value={currentRecord?.amount ?? ""} />
                  <BidResultDetailField label="경쟁사" value={currentRecord?.competitor ?? ""} />
                  <BidResultDetailField label="결과 사유" value={currentRecord?.reason ?? ""} />
                </section>

                {!selectedHistoryDetail && (
                  <div className="flex justify-end gap-2 border-t pt-6">
                    <Button variant="outline" asChild>
                      <Link href="/bid">목록</Link>
                    </Button>
                    <Button asChild>
                      <Link href={`/bid/result/${bidResult.id}/edit`}>수정</Link>
                    </Button>
                    <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                      삭제
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입찰 결과를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후에는 입찰 결과 상세 정보를 다시 확인할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
