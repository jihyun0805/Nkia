"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { getOpportunities, type OpportunityRecord } from "@/lib/finding-data"

export default function FindingOpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])

  useEffect(() => {
    const sync = () => setOpportunities(getOpportunities())
    sync()
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  const opportunityCards = useMemo(() => {
    const threshold = new Date()
    threshold.setMonth(threshold.getMonth() - 1)

    return opportunities
      .filter((item) => {
        const createdAt = item.createdAt ? new Date(`${item.createdAt}T00:00:00`) : null
        return createdAt ? createdAt >= threshold : false
      })
      .sort((a, b) => {
        if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt)
        return a.customer.localeCompare(b.customer, "ko")
      })
  }, [opportunities])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="사업기회 현황" description="최근 1개월 내 등록된 신규 사업기회를 고객사 카드로 확인합니다" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/finding?tab=opportunities">발굴</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>전체 보기</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">최근 1개월 신규 사업기회 카드 전체 보기</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{opportunityCards.length}건</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/finding?tab=opportunities">메인으로</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {opportunityCards.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {opportunityCards.map((opp) => (
                      <button
                        key={opp.id}
                        type="button"
                        className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                        onClick={() => router.push(`/activity/customers/${opp.customerCode}?opportunityId=${opp.id}`)}
                      >
                        <div className="flex h-full flex-col justify-between">
                          <div>
                            <p className="line-clamp-2 text-lg font-semibold">{opp.customer}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{opp.id}</p>
                            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{opp.name}</p>
                          </div>
                          <div className="mt-5 text-sm text-muted-foreground">
                            <p>제품 {opp.product}</p>
                            <p>예산/예상매출 {opp.expectedAmount}</p>
                            <p>예상시점 {opp.expectedDate}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    최근 1개월 내 등록된 사업기회가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
