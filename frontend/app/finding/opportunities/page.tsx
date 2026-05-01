"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { opportunities } from "@/lib/finding-data"

export default function FindingOpportunitiesPage() {
  const router = useRouter()

  const opportunityCards = useMemo(
    () =>
      [...opportunities].sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      }),
    [],
  )

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="사업기회 현황" description="사업기회 카드를 선택해 해당 사업기회의 상세 정보를 확인합니다" />
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
                  <CardTitle className="text-lg">사업기회 카드 전체 보기</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{opportunityCards.length}건</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/finding?tab=opportunities">메인으로</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {opportunityCards.map((opp) => (
                    <button
                      key={opp.id}
                      type="button"
                      className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/finding/opportunities/${opp.id}?tab=opportunities`)}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <p className="line-clamp-2 text-lg font-semibold">{opp.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{opp.id}</p>
                        </div>
                        <div className="mt-5 text-sm text-muted-foreground">
                          <p>{opp.customer}</p>
                          <p>상태 {opp.status}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
