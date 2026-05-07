"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/erp/header"
import { Sidebar } from "@/components/erp/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getBidResultById, subscribeBidResultUpdates, type BidResultAttachment, type BidResultRecord } from "@/lib/bid-data"

function BidResultDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input readOnly value={value || "-"} />
    </div>
  )
}

function BidResultAttachmentField({ bidResult }: { bidResult: BidResultRecord }) {
  const attachments: BidResultAttachment[] = bidResult.attachments ?? bidResult.attachmentNames.map((name) => ({ name }))

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>첨부파일</Label>
      {attachments.length > 0 ? (
        <div className="space-y-2 rounded-md border px-4 py-3">
          {attachments.map((attachment, index) =>
            attachment.url ? (
              <a
                key={`${attachment.name}-${index}`}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {attachment.name}
              </a>
            ) : (
              <p key={`${attachment.name}-${index}`} className="text-sm text-muted-foreground">
                {attachment.name}
              </p>
            ),
          )}
        </div>
      ) : (
        <Input readOnly value="등록된 첨부파일이 없습니다." />
      )}
    </div>
  )
}

export function BidResultDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? ""
  const [bidResult, setBidResult] = useState<BidResultRecord | null>(null)

  useEffect(() => {
    const sync = () => setBidResult(getBidResultById(id))
    sync()
    const unsubscribe = subscribeBidResultUpdates(sync)
    window.addEventListener("storage", sync)

    return () => {
      unsubscribe()
      window.removeEventListener("storage", sync)
    }
  }, [id])

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
                  <BidResultAttachmentField bidResult={bidResult} />
                </section>

                <div className="flex justify-end gap-2 border-t pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/bid">목록</Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/bid/result/${bidResult.id}/edit`}>수정</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
