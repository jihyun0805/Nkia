"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Header } from "@/components/erp/header"
import { FilterPopover } from "@/components/erp/filter-popover"
import { Sidebar } from "@/components/erp/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { findingStatuses, getCustomers, opportunities, partners } from "@/lib/finding-data"
import { Building2, Plus, Search, Target, Users } from "lucide-react"

type FindingTab = "opportunities" | "customers" | "partners"

function FindingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const initialTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<FindingTab>(
    initialTab === "customers" || initialTab === "partners" ? initialTab : "opportunities",
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "opportunities" || tab === "customers" || tab === "partners") {
      setActiveTab(tab)
    }
  }, [searchParams])

  if (!isMounted) {
    return null
  }

  const handleTabChange = (value: FindingTab) => {
    setActiveTab(value)
    router.replace(`/finding?tab=${value}`, { scroll: false })
  }

  const q = searchTerm.toLowerCase()
  const customerRows = getCustomers()

  const findingFieldOptions =
    activeTab === "opportunities"
      ? [
          { key: "category", label: "고객군", options: uniqueOptions(opportunities, (item) => item.category) },
          { key: "product", label: "제품", options: uniqueOptions(opportunities, (item) => item.product) },
          { key: "customerCode", label: "고객 코드", options: uniqueOptions(opportunities, (item) => item.customerCode) },
          { key: "customer", label: "고객사", options: uniqueOptions(opportunities, (item) => item.customer) },
        ]
      : activeTab === "customers"
        ? [{ key: "category", label: "고객군", options: uniqueOptions(customerRows, (item) => item.category) }]
        : [{ key: "type", label: "협력사 유형", options: uniqueOptions(partners, (item) => item.type) }]

  const filteredOpportunities = filterRecords(opportunities, filters, {
    status: (item) => item.status,
    owner: (item) => item.salesRep,
    fields: {
      category: (item) => item.category,
      product: (item) => item.product,
      customerCode: (item) => item.customerCode,
      customer: (item) => item.customer,
    },
  }).filter((item) =>
    [item.id, item.customerCode, item.name, item.customer, item.partner, item.product, item.salesRep]
      .join(" ")
      .toLowerCase()
      .includes(q),
  )

  const filteredCustomers = filterRecords(customerRows, filters, {
    owner: (item) => item.contact,
    fields: {
      category: (item) => item.category,
    },
  }).filter((item) => [item.id, item.name, item.contact, item.phone].join(" ").toLowerCase().includes(q))

  const filteredPartners = filterRecords(partners, filters, {
    owner: (item) => item.contact,
    fields: {
      type: (item) => item.type,
    },
  }).filter((item) => [item.id, item.name, item.type, item.contact, item.phone].join(" ").toLowerCase().includes(q))

  const registerHref =
    activeTab === "customers"
      ? "/finding/new/customers"
      : activeTab === "partners"
        ? "/finding/new/partners"
        : "/finding/new/opportunities"

  const registerLabel =
    activeTab === "customers" ? "고객사 등록" : activeTab === "partners" ? "협력사 등록" : "사업기회 등록"

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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="검색..."
                    className="w-64 pl-9"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

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
                    <CardTitle className="text-lg">사업기회 목록</CardTitle>
                    <Badge variant="secondary">{filteredOpportunities.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[110px]">고객코드</TableHead>
                        <TableHead className="w-[120px]">사업코드</TableHead>
                        <TableHead>사업명</TableHead>
                        <TableHead>고객사</TableHead>
                        <TableHead>협력사</TableHead>
                        <TableHead>고객군</TableHead>
                        <TableHead>제품</TableHead>
                        <TableHead className="text-right">예상 예산/매출</TableHead>
                        <TableHead>예상시점</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>담당자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOpportunities.map((opp) => (
                        <TableRow
                          key={opp.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/finding/opportunities/${opp.id}?tab=${activeTab}`)}
                        >
                          <TableCell className="font-mono text-sm">{opp.customerCode}</TableCell>
                          <TableCell className="font-mono text-sm">{opp.id}</TableCell>
                          <TableCell className="font-medium">{opp.name}</TableCell>
                          <TableCell>{opp.customer}</TableCell>
                          <TableCell>{opp.partner}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                opp.category === "공공" ? "default" : opp.category === "해외" ? "secondary" : "outline"
                              }
                            >
                              {opp.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{opp.product}</TableCell>
                          <TableCell className="text-right font-medium">{opp.expectedAmount}</TableCell>
                          <TableCell>{opp.expectedDate}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                opp.status === "진행중" ? "default" : opp.status === "유망" ? "secondary" : "outline"
                              }
                              className={
                                opp.status === "진행중"
                                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                                  : opp.status === "유망"
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                    : ""
                              }
                            >
                              {opp.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{opp.salesRep}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">고객사 목록</CardTitle>
                    <Badge variant="secondary">{filteredCustomers.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">고객사코드</TableHead>
                        <TableHead>고객사명</TableHead>
                        <TableHead>고객군</TableHead>
                        <TableHead className="text-center">진행중 사업기회</TableHead>
                        <TableHead className="text-center">계약 수</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead>연락처</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/finding/customers/${customer.id}?tab=${activeTab}`)}
                        >
                          <TableCell className="font-mono text-sm">{customer.id}</TableCell>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                customer.category === "공공"
                                  ? "default"
                                  : customer.category === "해외"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {customer.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{customer.opportunities}</TableCell>
                          <TableCell className="text-center">{customer.contracts}</TableCell>
                          <TableCell>{customer.contact}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="partners">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">협력사 목록</CardTitle>
                    <Badge variant="secondary">{filteredPartners.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">협력사코드</TableHead>
                        <TableHead>협력사명</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead className="text-center">진행중 사업기회</TableHead>
                        <TableHead className="text-center">진행중 프로젝트</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead>연락처</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartners.map((partner) => (
                        <TableRow
                          key={partner.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/finding/partners/${partner.id}?tab=${activeTab}`)}
                        >
                          <TableCell className="font-mono text-sm">{partner.id}</TableCell>
                          <TableCell className="font-medium">{partner.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{partner.type}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{partner.opportunities}</TableCell>
                          <TableCell className="text-center">{partner.projects}</TableCell>
                          <TableCell>{partner.contact}</TableCell>
                          <TableCell>{partner.phone}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
