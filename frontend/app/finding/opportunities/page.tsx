"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { type OpportunityRecord } from "@/lib/finding-data"
import { loadBackendFindingData } from "@/lib/finding-backend"
import { Search } from "lucide-react"

export default function FindingOpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("")

  useEffect(() => {
    let cancelled = false

    loadBackendFindingData()
      .then((data) => {
        if (!cancelled) {
          setOpportunities(data.opportunities)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpportunities([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const opportunityCards = useMemo(() => {
    const normalizedSearchTerm = appliedSearchTerm.trim().toLowerCase()

    return [...opportunities]
      .filter((item) => {
        if (!normalizedSearchTerm) return true
        return [item.id, item.customerCode, item.name, item.customer, item.partner, item.product, item.salesRep]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchTerm)
      })
      .sort((a, b) => {
        const customerCompare = a.customer.localeCompare(b.customer, "ko")
        if (customerCompare !== 0) return customerCompare
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      })
  }, [opportunities, appliedSearchTerm])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="사업기회 현황" description="등록된 사업기회를 고객사 카드로 확인합니다" />
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
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        setAppliedSearchTerm(searchTerm)
                      }}
                    >
                      <Input
                        placeholder="검색어 입력"
                        className="w-64"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                      <Button type="submit" variant="outline" size="sm" className="gap-2">
                        <Search className="h-4 w-4" />
                        검색
                      </Button>
                    </form>
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
                        onClick={() => router.push(`/activity/customers/${opp.customerCode}`)}
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
                    등록된 사업기회가 없습니다.
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
