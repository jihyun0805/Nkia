"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Header } from "@/components/erp/header"
import { Sidebar } from "@/components/erp/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { deleteBackendBidResult, loadBackendBidResultDetailById } from "@/lib/bid-result-backend"
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

export function BidResultDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const [bidResult, setBidResult] = useState<BidResultRecord | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    void loadBackendBidResultDetailById(id)
      .then((record) => {
        if (!cancelled) {
          setBidResult(record)
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

  const handleDelete = async () => {
    try {
      await deleteBackendBidResult(id)
    } catch {
      toast({
        title: "입찰 결과 삭제 실패",
        description: "삭제할 입찰 결과를 찾지 못했습니다.",
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
        <Header title="입찰 결과 상세" description="등록된 입찰 결과 정보를 조회합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/bid">입찰</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{bidResult.id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="border-b pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold tracking-tight">{bidResult.opportunity}</CardTitle>
                  <p className="text-sm text-muted-foreground">{bidResult.id}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="grid gap-4 md:grid-cols-2">
                  <BidResultDetailField label="입찰 결과 코드" value={bidResult.id} />
                  <BidResultDetailField label="제안서 코드" value={bidResult.proposalId} />
                  <BidResultDetailField label="고객사" value={bidResult.customer} />
                  <BidResultDetailField label="사업명" value={bidResult.opportunity} />
                  <BidResultDetailField label="제안형태" value={bidResult.proposalType} />
                  <BidResultDetailField label="제품군" value={bidResult.productGroup} />
                  <BidResultDetailField label="제안서 마감일" value={bidResult.proposalDeadline} />
                  <BidResultDetailField label="입찰 결과" value={bidResult.result} />
                  <BidResultDetailField label="영업대표" value={bidResult.salesRep} />
                  <BidResultDetailField label="상태" value={bidResult.result} />
                  <BidResultDetailField label="입찰일" value={bidResult.bidDate} />
                  <BidResultDetailField label="금액" value={bidResult.amount} />
                  <BidResultDetailField label="경쟁사" value={bidResult.competitor} />
                  <BidResultDetailField label="결과 사유" value={bidResult.reason} />
                </section>

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
