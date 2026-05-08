"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Shield, ShieldCheck, HeadphonesIcon, AlertTriangle } from "lucide-react"
import { FilterPopover } from "@/components/erp/filter-popover"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { customerSupports, freeMaintenances, paidMaintenances } from "@/lib/maintenance-data"

export default function MaintenancePage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [activeTab, setActiveTab] = useState<"free" | "paid" | "support">("free")

  const q = searchTerm.toLowerCase()
  const maintenanceFieldOptions = activeTab === "free"
    ? [
      { key: "customer", label: "고객사", options: uniqueOptions(freeMaintenances, (item) => item.customer) },
      { key: "product", label: "제품", options: uniqueOptions(freeMaintenances, (item) => item.product) },
    ]
    : activeTab === "paid"
      ? [
        { key: "customer", label: "고객사", options: uniqueOptions(paidMaintenances, (item) => item.customer) },
        { key: "product", label: "제품", options: uniqueOptions(paidMaintenances, (item) => item.product) },
      ]
      : [
        { key: "customer", label: "고객사", options: uniqueOptions(customerSupports, (item) => item.customer) },
        { key: "type", label: "지원유형", options: uniqueOptions(customerSupports, (item) => item.type) },
      ]
  const filteredFreeMaintenances = filterRecords(freeMaintenances, filters, { status: (item) => item.status, owner: (item) => item.manager, date: (item) => item.startDate, fields: { customer: (item) => item.customer, product: (item) => item.product } })
    .filter((item) => [item.customer, item.opportunity, item.product, item.salesRep, item.manager].join(" ").toLowerCase().includes(q))
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
  const filteredPaidMaintenances = filterRecords(paidMaintenances, filters, { status: (item) => item.status, owner: (item) => item.manager, date: (item) => item.startDate, fields: { customer: (item) => item.customer, product: (item) => item.product } }).filter((item) => [item.id, item.customer, item.product, item.manager, item.progress].join(" ").toLowerCase().includes(q))
  const filteredCustomerSupports = filterRecords(customerSupports, filters, { status: (item) => item.status, owner: (item) => item.manager, date: (item) => item.date, fields: { customer: (item) => item.customer, type: (item) => item.type } }).filter((item) => [item.id, item.customer, item.type, item.content, item.manager, item.supporter].join(" ").toLowerCase().includes(q))
  const maintenanceStatuses = ["진행중", "종료", "종료예정", "미체결", "완료", "예정"]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="유지보수" description="무상/유상 유지보수 계약 및 고객 지원을 관리합니다" />
        <main className="flex-1 p-6 overflow-auto">

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "free" | "paid" | "support")} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="free" className="gap-2"><Shield className="w-4 h-4" />무상유지보수</TabsTrigger>
                <TabsTrigger value="paid" className="gap-2"><ShieldCheck className="w-4 h-4" />유상유지보수</TabsTrigger>
                <TabsTrigger value="support" className="gap-2"><HeadphonesIcon className="w-4 h-4" />고객지원</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="검색..." className="pl-9 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <FilterPopover title="유지보수" statusOptions={maintenanceStatuses} value={filters} onApply={setFilters} fieldOptions={maintenanceFieldOptions} />
              </div>
            </div>

            <TabsContent value="free">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">무상유지보수 현황</CardTitle>
                    <Badge variant="secondary">{filteredFreeMaintenances.length}건</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>고객사</TableHead>
                        <TableHead>사업기회</TableHead>
                        <TableHead>납품 제품</TableHead>
                        <TableHead className="text-right">계약 금액</TableHead>
                        <TableHead>계약개시일</TableHead>
                        <TableHead>계약종료일</TableHead>
                        <TableHead>영업대표</TableHead>
                        <TableHead>유지보수 담당자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFreeMaintenances.map((item) => (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/maintenance/free/${item.id}`)}>
                          <TableCell className="font-medium">{item.customer}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{item.opportunity}</TableCell>
                          <TableCell>{item.product}</TableCell>
                          <TableCell className="text-right font-medium">₩{parseInt(item.amount.replace(/,/g, "")).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{item.startDate}</TableCell>
                          <TableCell className="text-sm">{item.endDate}</TableCell>
                          <TableCell>{item.salesRep}</TableCell>
                          <TableCell>{item.manager}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="paid">
              <Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">유상유지보수 현황</CardTitle><Badge variant="secondary">{filteredPaidMaintenances.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[120px]">유지보수번호</TableHead><TableHead>고객사</TableHead><TableHead>제품</TableHead><TableHead>계약기간</TableHead><TableHead className="text-right">계약금액</TableHead><TableHead>담당자</TableHead><TableHead>진행상태</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>{filteredPaidMaintenances.map((item) => <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/maintenance/paid/${item.id}`)}><TableCell className="font-mono text-sm">{item.id}</TableCell><TableCell className="font-medium">{item.customer}</TableCell><TableCell>{item.product}</TableCell><TableCell className="text-sm">{item.startDate} ~ {item.endDate}</TableCell><TableCell className="text-right font-medium">₩{parseInt(item.amount).toLocaleString()}</TableCell><TableCell>{item.manager}</TableCell><TableCell><Badge variant="outline">{item.progress}</Badge></TableCell><TableCell><Badge variant={item.status === "진행중" ? "default" : item.status === "종료예정" ? "secondary" : "destructive"} className={item.status === "진행중" ? "bg-green-100 text-green-700 hover:bg-green-100" : item.status === "종료예정" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>{item.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
            </TabsContent>

            <TabsContent value="support">
              <Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">고객지원 현황</CardTitle><Badge variant="secondary">{filteredCustomerSupports.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[130px]">지원번호</TableHead><TableHead>지원일</TableHead><TableHead>고객사</TableHead><TableHead>유형</TableHead><TableHead>내용</TableHead><TableHead className="text-center">소요시간</TableHead><TableHead>담당자</TableHead><TableHead>지원인력</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>{filteredCustomerSupports.map((item) => <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/maintenance/support/${item.id}`)}><TableCell className="font-mono text-sm">{item.id}</TableCell><TableCell>{item.date}</TableCell><TableCell className="font-medium">{item.customer}</TableCell><TableCell><Badge variant={item.type === "장애" ? "destructive" : item.type === "정기" ? "default" : "outline"} className={item.type === "장애" ? "bg-red-100 text-red-700 hover:bg-red-100" : item.type === "정기" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : ""}>{item.type}</Badge></TableCell><TableCell className="max-w-[200px] truncate">{item.content}</TableCell><TableCell className="text-center">{item.hours}시간</TableCell><TableCell>{item.manager}</TableCell><TableCell>{item.supporter}</TableCell><TableCell><Badge variant={item.status === "완료" ? "default" : "outline"} className={item.status === "완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-purple-100 text-purple-700 hover:bg-purple-100"}>{item.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
