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
import { ArrowLeft, Building2, Search } from "lucide-react"

type CustomerGroup = {
  key: string
  customer: string
  customerCode: string
  items: OpportunityRecord[]
}

export default function FindingOpportunitiesPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("")
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null)

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

  const customerGroups = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, CustomerGroup>()
    for (const opp of opportunities) {
      const key = (opp.customerCode || opp.customer || "UNKNOWN").trim() || "UNKNOWN"
      const existing = map.get(key)
      if (existing) {
        existing.items.push(opp)
      } else {
        map.set(key, {
          key,
          customer: opp.customer || "(이름 없음)",
          customerCode: opp.customerCode || "",
          items: [opp],
        })
      }
    }
    for (const group of map.values()) {
      group.items.sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      })
    }
    return Array.from(map.values()).sort((a, b) => a.customer.localeCompare(b.customer, "ko"))
  }, [opportunities])

  const selectedGroup = useMemo<CustomerGroup | null>(() => {
    if (!selectedCustomerKey) return null
    return customerGroups.find((group) => group.key === selectedCustomerKey) ?? null
  }, [customerGroups, selectedCustomerKey])

  const filteredCustomerGroups = useMemo(() => {
    const normalized = appliedSearchTerm.trim().toLowerCase()
    if (!normalized) return customerGroups
    return customerGroups.filter((group) => {
      if (group.customer.toLowerCase().includes(normalized)) return true
      if (group.customerCode.toLowerCase().includes(normalized)) return true
      return group.items.some((opp) =>
        [opp.id, opp.name, opp.partner, opp.product, opp.salesRep]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
    })
  }, [customerGroups, appliedSearchTerm])

  const filteredOpportunities = useMemo(() => {
    if (!selectedGroup) return []
    const normalized = appliedSearchTerm.trim().toLowerCase()
    if (!normalized) return selectedGroup.items
    return selectedGroup.items.filter((opp) =>
      [opp.id, opp.name, opp.partner, opp.product, opp.salesRep]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    )
  }, [selectedGroup, appliedSearchTerm])

  const totalOpportunityCount = opportunities.length

  const handleSelectCustomer = (key: string) => {
    setSelectedCustomerKey(key)
    setSearchTerm("")
    setAppliedSearchTerm("")
  }

  const handleBackToCustomers = () => {
    setSelectedCustomerKey(null)
    setSearchTerm("")
    setAppliedSearchTerm("")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="사업기회 현황" description="고객사 카드를 선택하면 해당 고객사의 사업기회를 확인할 수 있습니다" />
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
                {selectedGroup ? (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <button type="button" onClick={handleBackToCustomers}>
                          고객사 목록
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedGroup.customer}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage>고객사 목록</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedGroup ? `${selectedGroup.customer} 사업기회` : "고객사 카드 보기"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        setAppliedSearchTerm(searchTerm)
                      }}
                    >
                      <Input
                        placeholder={selectedGroup ? "사업기회 검색" : "고객사/사업기회 검색"}
                        className="w-64"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                      <Button type="submit" variant="outline" size="sm" className="gap-2">
                        <Search className="h-4 w-4" />
                        검색
                      </Button>
                    </form>
                    {selectedGroup ? (
                      <Badge variant="secondary">{filteredOpportunities.length}건</Badge>
                    ) : (
                      <Badge variant="secondary">
                        고객사 {filteredCustomerGroups.length}개 · 사업기회 {totalOpportunityCount}건
                      </Badge>
                    )}
                    {selectedGroup ? (
                      <Button variant="outline" size="sm" className="gap-2" onClick={handleBackToCustomers}>
                        <ArrowLeft className="h-4 w-4" />
                        고객사 목록
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/finding?tab=opportunities">메인으로</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedGroup ? (
                  filteredOpportunities.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredOpportunities.map((opp) => (
                        <button
                          key={opp.id}
                          type="button"
                          className="min-h-[180px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                          onClick={() => router.push(`/finding/opportunities/${encodeURIComponent(opp.id)}?tab=opportunities`)}
                        >
                          <div className="flex h-full flex-col justify-between">
                            <div>
                              <p className="line-clamp-2 text-lg font-semibold">{opp.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{opp.id}</p>
                              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{opp.customer}</p>
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
                      검색 결과가 없습니다.
                    </div>
                  )
                ) : filteredCustomerGroups.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {filteredCustomerGroups.map((group) => (
                      <button
                        key={group.key}
                        type="button"
                        className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                        onClick={() => handleSelectCustomer(group.key)}
                      >
                        <div className="flex h-full flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                              <p className="line-clamp-2 text-lg font-semibold">{group.customer}</p>
                            </div>
                            {group.customerCode && (
                              <p className="mt-1 text-xs text-muted-foreground">{group.customerCode}</p>
                            )}
                          </div>
                          <div className="mt-5 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">사업기회</span>
                            <Badge variant="outline">{group.items.length}건</Badge>
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
