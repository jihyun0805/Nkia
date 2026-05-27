"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/erp/header"
import { FilterPopover } from "@/components/erp/filter-popover"
import { Sidebar } from "@/components/erp/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { findingStatuses, type CustomerRecord, type OpportunityRecord, type PartnerRecord } from "@/lib/finding-data"
import { loadBackendFindingData } from "@/lib/finding-backend"
import { ArrowLeft, Building2, Plus, Search, Target, Users } from "lucide-react"

// 발굴 메인 탭 구분값.
// - opportunities: 사업기회 목록
// - customers: 고객사 목록
// - partners: 협력사 목록
// 이 값은 URL query(tab)와 sessionStorage에 그대로 저장되어
// 사용자가 마지막으로 보던 발굴 탭을 다시 열 때 복원하는 데 사용된다.
type FindingTab = "opportunities" | "customers" | "partners"
const FINDING_ACTIVE_TAB_STORAGE_KEY = "orbis.finding.active-tab"

function FindingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [searchTerm, setSearchTerm] = useState("")
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("")
  const initialTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<FindingTab>(
    initialTab === "customers" || initialTab === "partners" ? initialTab : "opportunities",
  )
  const [customerRows, setCustomerRows] = useState<CustomerRecord[]>([])
  const [opportunityRows, setOpportunityRows] = useState<OpportunityRecord[]>([])
  const [partnerRows, setPartnerRows] = useState<PartnerRecord[]>([])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    loadBackendFindingData()
      .then((data) => {
        if (cancelled) return
        setCustomerRows(data.customers)
        setOpportunityRows(data.opportunities)
        setPartnerRows(data.partners)
      })
      .catch(() => {
        if (cancelled) return
        setCustomerRows([])
        setOpportunityRows([])
        setPartnerRows([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "opportunities" || tab === "customers" || tab === "partners") {
      setActiveTab(tab)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(FINDING_ACTIVE_TAB_STORAGE_KEY, tab)
      }
      return
    }

    if (typeof window !== "undefined") {
      const storedTab = window.sessionStorage.getItem(FINDING_ACTIVE_TAB_STORAGE_KEY)
      if (storedTab === "opportunities" || storedTab === "customers" || storedTab === "partners") {
        setActiveTab(storedTab)
      }
    }
  }, [searchParams])

  const handleTabChange = (value: FindingTab) => {
    setActiveTab(value)
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(FINDING_ACTIVE_TAB_STORAGE_KEY, value)
    }
    router.replace(`/finding?tab=${value}`, { scroll: false })
  }

  const normalizedSearchTerm = appliedSearchTerm.trim().toLowerCase()

  const matchesSearch = (values: Array<string | number | null | undefined>) => {
    if (!normalizedSearchTerm) return true
    return values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchTerm)
  }

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm)
  }

  const findingFieldOptions =
    activeTab === "opportunities"
      ? [
          { key: "category", label: "고객군", options: uniqueOptions(opportunityRows, (item) => item.category) },
          { key: "product", label: "제품", options: uniqueOptions(opportunityRows, (item) => item.product) },
          { key: "customerCode", label: "고객 코드", options: uniqueOptions(opportunityRows, (item) => item.customerCode) },
          { key: "customer", label: "고객사", options: uniqueOptions(opportunityRows, (item) => item.customer) },
        ]
      : activeTab === "customers"
        ? [{ key: "category", label: "고객군", options: uniqueOptions(customerRows, (item) => item.category) }]
        : [{ key: "type", label: "협력사 유형", options: uniqueOptions(partnerRows, (item) => item.type) }]

  const filteredOpportunities = filterRecords(opportunityRows, filters, {
    status: (item) => item.status,
    owner: (item) => item.salesRep,
    fields: {
      category: (item) => item.category,
      product: (item) => item.product,
      customerCode: (item) => item.customerCode,
      customer: (item) => item.customer,
    },
  }).filter((item) =>
    matchesSearch([item.id, item.customerCode, item.name, item.customer, item.partner, item.product, item.salesRep]),
  )

  const opportunityCards = useMemo(
    () =>
      [...filteredOpportunities].sort((a, b) => {
        const customerCompare = a.customer.localeCompare(b.customer, "ko")
        if (customerCompare !== 0) return customerCompare
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      }),
    [filteredOpportunities],
  )

  const opportunityCustomerGroups = useMemo(() => {
    const map = new Map<string, { key: string; customer: string; customerCode: string; items: OpportunityRecord[] }>()
    for (const opp of opportunityCards) {
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
    return Array.from(map.values()).sort((a, b) => a.customer.localeCompare(b.customer, "ko"))
  }, [opportunityCards])

  const [selectedOppCustomerKey, setSelectedOppCustomerKey] = useState<string | null>(null)
  const selectedOppGroup = useMemo(
    () => (selectedOppCustomerKey ? opportunityCustomerGroups.find((g) => g.key === selectedOppCustomerKey) ?? null : null),
    [opportunityCustomerGroups, selectedOppCustomerKey],
  )

  const filteredCustomers = filterRecords(customerRows, filters, {
    owner: (item) => item.contact,
    fields: {
      category: (item) => item.category,
    },
  }).filter((item) => matchesSearch([item.id, item.name, item.contact, item.phone, item.category]))

  const filteredPartners = filterRecords(partnerRows, filters, {
    owner: (item) => item.contact,
    fields: {
      type: (item) => item.type,
    },
  }).filter((item) => matchesSearch([item.id, item.name, item.contact, item.phone, item.type]))

  const customerCards = useMemo(
    () =>
      [...filteredCustomers].sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      }),
    [filteredCustomers],
  )

  const partnerCards = useMemo(
    () =>
      [...filteredPartners].sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, "ko")
        if (nameCompare !== 0) return nameCompare
        return a.id.localeCompare(b.id)
      }),
    [filteredPartners],
  )
  const registerHref =
    activeTab === "customers"
      ? "/finding/new/customers"
      : activeTab === "partners"
        ? "/finding/new/partners"
        : "/finding/new/opportunities"

  const registerLabel =
    activeTab === "customers" ? "고객사 등록" : activeTab === "partners" ? "협력사 등록" : "사업기회 등록"

  if (!isMounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header title="발굴" description="신규 고객 또는 신규 사업기회를 최초로 인지하고 시스템에 등록합니다" />

        <main className="flex-1 overflow-auto p-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => handleTabChange(value as FindingTab)}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="opportunities" className="gap-2">
                  <Target className="h-4 w-4" />
                  사업기회 현황
                </TabsTrigger>
                <TabsTrigger value="customers" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  고객사 현황
                </TabsTrigger>
                <TabsTrigger value="partners" className="gap-2">
                  <Users className="h-4 w-4" />
                  협력사 현황
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleSearch()
                  }}
                >
                  <Input
                    placeholder="검색어 입력"
                    className="w-64"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <Button type="submit" variant="outline" className="gap-2">
                    <Search className="h-4 w-4" />
                    검색
                  </Button>
                </form>

                <FilterPopover
                  title="발굴"
                  statusOptions={findingStatuses}
                  value={filters}
                  onApply={setFilters}
                  ownerLabel="담당자"
                  fieldOptions={findingFieldOptions}
                />

                <Button asChild>
                  <Link href={registerHref}>
                    <Plus className="mr-2 h-4 w-4" />
                    {registerLabel}
                  </Link>
                </Button>
              </div>
            </div>

            <TabsContent value="opportunities" className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {selectedOppGroup ? `${selectedOppGroup.customer} 사업기회` : "고객사 카드 보기"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {selectedOppGroup ? (
                        <Badge variant="secondary">{selectedOppGroup.items.length}건</Badge>
                      ) : (
                        <Badge variant="secondary">
                          고객사 {opportunityCustomerGroups.length}개 · 사업기회 {opportunityCards.length}건
                        </Badge>
                      )}
                      {selectedOppGroup && (
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedOppCustomerKey(null)}>
                          <ArrowLeft className="h-4 w-4" />
                          고객사 목록
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedOppGroup ? (
                    selectedOppGroup.items.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {selectedOppGroup.items.map((opp) => (
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
                        해당 고객사의 사업기회가 없습니다.
                      </div>
                    )
                  ) : opportunityCustomerGroups.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {opportunityCustomerGroups.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                          onClick={() => setSelectedOppCustomerKey(group.key)}
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
            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">고객사 현황</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{filteredCustomers.length}개 고객사</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {customerCards.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      {customerCards.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                          onClick={() => router.push(`/finding/customers/${customer.id}?tab=${activeTab}`)}
                        >
                          <div className="flex h-full flex-col justify-between">
                            <div>
                              <p className="line-clamp-2 text-lg font-semibold">{customer.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{customer.id}</p>
                            </div>
                            <div className="mt-5 text-sm text-muted-foreground">
                              <p>누적계약건수 {customer.contracts}건</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      조건에 맞는 고객사가 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="partners">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">협력사 현황</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{filteredPartners.length}개 협력사</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {partnerCards.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      {partnerCards.map((partner) => (
                        <button
                          key={partner.id}
                          type="button"
                          className="min-h-[168px] rounded-xl border p-5 text-left transition-colors hover:bg-muted/50"
                          onClick={() => router.push(`/finding/partners/${partner.id}?tab=${activeTab}`)}
                        >
                          <div className="flex h-full flex-col justify-between">
                            <div>
                              <p className="line-clamp-2 text-lg font-semibold">{partner.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{partner.id}</p>
                            </div>
                            <div className="mt-5 text-sm text-muted-foreground">
                              <p>누적프로젝트건수 {partner.projects}건</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      조건에 맞는 협력사가 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

export default function FindingPage() {
  return (
    <Suspense fallback={null}>
      <FindingPageContent />
    </Suspense>
  )
}
