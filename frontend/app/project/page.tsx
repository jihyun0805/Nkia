"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ClipboardList, Receipt, Wallet, TrendingUp, Plus } from "lucide-react"
import { FilterPopover } from "@/components/erp/filter-popover"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { billings, collections, expectedRevenue, projectResults } from "@/lib/project-data"
import { ProjectResultForm } from "@/components/erp/project/project-result-form"
import { BillingRequestForm } from "@/components/erp/project/billing-request-form"

export default function ProjectPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [activeTab, setActiveTab] = useState<"results" | "billing" | "collection" | "revenue">("results")
  const [isCreating, setIsCreating] = useState(false)

  const totalRevenue = expectedRevenue.reduce((acc, row) => acc + row.ems + row.itsm + row.automation + row.wss, 0)
  const q = searchTerm.toLowerCase()
  const projectFieldOptions = activeTab === "billing"
    ? [
      { key: "customer", label: "고객사", options: uniqueOptions(billings, (item) => item.customer) },
      { key: "type", label: "청구유형", options: uniqueOptions(billings, (item) => item.type) },
    ]
    : activeTab === "collection"
      ? [
        { key: "customer", label: "고객사", options: uniqueOptions(collections, (item) => item.customer) },
        { key: "method", label: "수금방법", options: uniqueOptions(collections, (item) => item.method) },
      ]
      : [{ key: "customer", label: "고객사", options: uniqueOptions(projectResults, (item) => item.customer) }]
  const filteredProjectResults = filterRecords(projectResults, filters, { owner: (item) => item.pm, date: (item) => item.registeredAt, fields: { customer: (item) => item.customer } })
    .filter((item) => [item.id, item.contractId, item.name, item.customer, item.pm, item.salesRep].join(" ").toLowerCase().includes(q))
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
  const filteredBillings = filterRecords(billings, filters, { status: (item) => item.status, date: (item) => item.issueDate, fields: { customer: (item) => item.customer, type: (item) => item.type } }).filter((item) => [item.id, item.projectId, item.customer, item.type, item.invoiceNo].join(" ").toLowerCase().includes(q))
  const filteredCollections = filterRecords(collections, filters, { status: (item) => item.status, date: (item) => item.dueDate, fields: { customer: (item) => item.customer, method: (item) => item.method } }).filter((item) => [item.id, item.billingId, item.customer, item.method].join(" ").toLowerCase().includes(q))
  const projectStatuses = ["진행중", "완료", "발행완료", "수금완료", "대기"]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="사업" description="사업 결과보고, 청구 및 수금을 관리합니다" />
        <main className="flex-1 p-6 overflow-auto">
          <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as "results" | "billing" | "collection" | "revenue"); setIsCreating(false); }} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="results" className="gap-2"><ClipboardList className="w-4 h-4" />결과보고</TabsTrigger>
                <TabsTrigger value="billing" className="gap-2"><Receipt className="w-4 h-4" />청구</TabsTrigger>
                <TabsTrigger value="collection" className="gap-2"><Wallet className="w-4 h-4" />수금</TabsTrigger>
                <TabsTrigger value="revenue" className="gap-2"><TrendingUp className="w-4 h-4" />예상 매출액</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {!isCreating ? (
                  <>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="검색..." className="pl-9 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isCreating} /></div>
                    <FilterPopover title="사업" statusOptions={projectStatuses} value={filters} onApply={setFilters} fieldOptions={projectFieldOptions} />
                    {activeTab === "results" && (
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 w-4 h-4" /> 사업결과보고 등록
                      </Button>
                    )}
                    {activeTab === "billing" && (
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 w-4 h-4" /> 세금계산서 발행 요청
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    목록으로 돌아가기
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="results">
              {!isCreating ? (
                <Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">사업 현황</CardTitle><Badge variant="secondary">{filteredProjectResults.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[120px]">사업번호</TableHead><TableHead>고객사</TableHead><TableHead>사업명</TableHead><TableHead className="text-right">사업금액</TableHead><TableHead>사업개시일</TableHead><TableHead>사업완료일</TableHead><TableHead>PM</TableHead><TableHead>영업대표</TableHead></TableRow></TableHeader><TableBody>{filteredProjectResults.map((project) => <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/project/results/${project.id}`)}><TableCell className="font-mono text-sm">{project.id}</TableCell><TableCell>{project.customer}</TableCell><TableCell className="font-medium max-w-[150px] truncate">{project.name}</TableCell><TableCell className="text-right font-medium">₩{project.amount.toLocaleString()}</TableCell><TableCell className="text-sm">{project.startDate}</TableCell><TableCell className="text-sm">{project.endDate}</TableCell><TableCell>{project.pm}</TableCell><TableCell>{project.salesRep}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              ) : (
                <ProjectResultForm
                  onSuccess={() => setIsCreating(false)}
                  onCancel={() => setIsCreating(false)}
                  inheritedData={{
                    customerId: "CUST-001",
                    customerName: "삼성전자",
                    opportunityId: "OPP-2026-001",
                    opportunityName: "삼성전자 EMS 구축",
                    orderReportId: "ORD-2026-001",
                    contractId: "CTR-2026-001"
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="billing">
              {!isCreating ? (
                <Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">청구 현황</CardTitle><Badge variant="secondary">{filteredBillings.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[120px]">청구번호</TableHead><TableHead>사업번호</TableHead><TableHead>고객사</TableHead><TableHead>청구유형</TableHead><TableHead className="text-right">청구금액</TableHead><TableHead>발행일</TableHead><TableHead>납기일</TableHead><TableHead>세금계산서</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>{filteredBillings.map((billing) => <TableRow key={billing.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/project/billing/${billing.id}`)}><TableCell className="font-mono text-sm">{billing.id}</TableCell><TableCell className="font-mono text-sm">{billing.projectId}</TableCell><TableCell className="font-medium">{billing.customer}</TableCell><TableCell><Badge variant="outline">{billing.type}</Badge></TableCell><TableCell className="text-right font-medium">₩{parseInt(billing.amount).toLocaleString()}</TableCell><TableCell>{billing.issueDate}</TableCell><TableCell>{billing.dueDate}</TableCell><TableCell className="font-mono text-sm">{billing.invoiceNo}</TableCell><TableCell><Badge variant={billing.status === "수금완료" ? "default" : "secondary"} className={billing.status === "수금완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-blue-100 text-blue-700 hover:bg-blue-100"}>{billing.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              ) : (
                <BillingRequestForm
                  onSuccess={() => setIsCreating(false)}
                  onCancel={() => setIsCreating(false)}
                  inheritedData={{
                    customerId: "CUST-001",
                    customerName: "삼성전자",
                    opportunityId: "OPP-2026-001",
                    opportunityName: "삼성전자 EMS 구축",
                    orderReportId: "ORD-2026-001",
                    contractId: "CTR-2026-001",
                    projectName: "삼성전자 EMS 구축 사업"
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="collection">
              <Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">수금 현황</CardTitle><Badge variant="secondary">{filteredCollections.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[120px]">수금번호</TableHead><TableHead>청구번호</TableHead><TableHead>고객사</TableHead><TableHead className="text-right">수금금액</TableHead><TableHead>납기일</TableHead><TableHead>수금일</TableHead><TableHead>수금방법</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>{filteredCollections.map((collection) => <TableRow key={collection.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/project/collection/${collection.id}`)}><TableCell className="font-mono text-sm">{collection.id}</TableCell><TableCell className="font-mono text-sm">{collection.billingId}</TableCell><TableCell className="font-medium">{collection.customer}</TableCell><TableCell className="text-right font-medium">₩{parseInt(collection.amount).toLocaleString()}</TableCell><TableCell>{collection.dueDate}</TableCell><TableCell>{collection.collectedDate}</TableCell><TableCell>{collection.method}</TableCell><TableCell><Badge variant={collection.status === "수금완료" ? "default" : "outline"} className={collection.status === "수금완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>{collection.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
            </TabsContent>

            <TabsContent value="revenue">
              <Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">월별 예상 매출액</CardTitle><Badge variant="secondary">총 ₩{totalRevenue.toLocaleString()}</Badge></div></CardHeader><CardContent><div className="space-y-4">{expectedRevenue.map((row) => <div key={row.month} className="rounded-lg border p-4"><div className="mb-3 flex items-center justify-between"><p className="font-semibold">{row.month}</p><p className="text-sm text-muted-foreground">합계 ₩{(row.ems + row.itsm + row.automation + row.wss).toLocaleString()}</p></div><div className="grid gap-3 md:grid-cols-4"><div className="rounded-md bg-blue-50 p-3"><p className="text-sm text-muted-foreground">EMS</p><p className="font-semibold">₩{row.ems.toLocaleString()}</p></div><div className="rounded-md bg-green-50 p-3"><p className="text-sm text-muted-foreground">ITSM</p><p className="font-semibold">₩{row.itsm.toLocaleString()}</p></div><div className="rounded-md bg-amber-50 p-3"><p className="text-sm text-muted-foreground">Automation</p><p className="font-semibold">₩{row.automation.toLocaleString()}</p></div><div className="rounded-md bg-pink-50 p-3"><p className="text-sm text-muted-foreground">WSS</p><p className="font-semibold">₩{row.wss.toLocaleString()}</p></div></div></div>)}</div></CardContent></Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
