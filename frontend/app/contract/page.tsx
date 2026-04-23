"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterPopover } from "@/components/erp/filter-popover"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { contracts, contractStatuses, licenses, orderReports } from "@/lib/contract-data"
import { Plus, Search, FileCheck, ScrollText, Key } from "lucide-react"

export default function ContractPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [activeTab, setActiveTab] = useState<"orders" | "contracts" | "licenses">("orders")
  const q = searchTerm.toLowerCase()
  const contractFieldOptions = activeTab === "orders"
    ? [{ key: "customer", label: "고객사", options: uniqueOptions(orderReports, (i) => i.customer) }]
    : activeTab === "contracts"
      ? [{ key: "customer", label: "고객사", options: uniqueOptions(contracts, (i) => i.customer) }]
      : [
        { key: "customer", label: "고객사", options: uniqueOptions(licenses, (i) => i.customer) },
        { key: "product", label: "제품", options: uniqueOptions(licenses, (i) => i.product) },
        { key: "type", label: "라이선스 유형", options: uniqueOptions(licenses, (i) => i.type) },
      ]
  const filteredOrderReports = filterRecords(orderReports, filters, { status: (i) => i.approvalStatus, owner: (i) => i.salesRep, date: (i) => i.orderDate, fields: { customer: (i) => i.customer } }).filter((i) => [i.id, i.name, i.customer, i.product, i.salesRep].join(" ").toLowerCase().includes(q))
  const filteredContracts = filterRecords(contracts, filters, { status: (i) => i.status, date: (i) => i.contractDate, fields: { customer: (i) => i.customer } }).filter((i) => [i.id, i.name, i.customer, i.orderId].join(" ").toLowerCase().includes(q))
  const filteredLicenses = filterRecords(licenses, filters, { status: (i) => i.status, date: (i) => i.issueDate, fields: { customer: (i) => i.customer, product: (i) => i.product, type: (i) => i.type } }).filter((i) => [i.id, i.customer, i.product, i.module].join(" ").toLowerCase().includes(q))
  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title="계약" description="수주 보고, 계약 관리 및 라이선스 발급을 관리합니다" />
      <main className="flex-1 overflow-auto p-6"><Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "orders" | "contracts" | "licenses")} className="space-y-6"><div className="flex items-center justify-between"><TabsList><TabsTrigger value="orders" className="gap-2"><FileCheck className="w-4 h-4" />수주보고</TabsTrigger><TabsTrigger value="contracts" className="gap-2"><ScrollText className="w-4 h-4" />계약관리</TabsTrigger><TabsTrigger value="licenses" className="gap-2"><Key className="w-4 h-4" />라이선스</TabsTrigger></TabsList><div className="flex items-center gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="검색..." className="w-64 pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><FilterPopover title="계약" statusOptions={contractStatuses} value={filters} onApply={setFilters} fieldOptions={contractFieldOptions} /><Button asChild><Link href={`/contract/new/${activeTab}`}><Plus className="mr-2 w-4 h-4" />{activeTab === "orders" ? "수주보고 등록" : activeTab === "contracts" ? "계약 등록" : "라이선스 등록"}</Link></Button></div></div>
      <TabsContent value="orders"><Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">수주보고 목록</CardTitle><Badge variant="secondary">{filteredOrderReports.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[120px]">수주번호</TableHead><TableHead>사업명</TableHead><TableHead>고객사</TableHead><TableHead>수주일</TableHead><TableHead className="text-right">계약금액</TableHead><TableHead>제품</TableHead><TableHead>영업담당</TableHead><TableHead>결재상태</TableHead><TableHead>최종결재자</TableHead></TableRow></TableHeader><TableBody>{filteredOrderReports.map((order) => <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/orders/${order.id}`)}><TableCell className="font-mono text-sm">{order.id}</TableCell><TableCell className="max-w-[180px] truncate font-medium">{order.name}</TableCell><TableCell>{order.customer}</TableCell><TableCell>{order.orderDate}</TableCell><TableCell className="text-right font-medium">₩{parseInt(order.amount).toLocaleString()}</TableCell><TableCell>{order.product}</TableCell><TableCell>{order.salesRep}</TableCell><TableCell><Badge variant={order.approvalStatus === "승인완료" ? "default" : "secondary"} className={order.approvalStatus === "승인완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>{order.approvalStatus}</Badge></TableCell><TableCell>{order.approver}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="contracts"><Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">계약 목록</CardTitle><Badge variant="secondary">{filteredContracts.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[120px]">계약번호</TableHead><TableHead>수주번호</TableHead><TableHead>사업명</TableHead><TableHead>고객사</TableHead><TableHead>계약일</TableHead><TableHead>사업기간</TableHead><TableHead className="text-right">계약금액</TableHead><TableHead>유지보수종료</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>{filteredContracts.map((contract) => <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/contracts/${contract.id}`)}><TableCell className="font-mono text-sm">{contract.id}</TableCell><TableCell className="font-mono text-sm">{contract.orderId}</TableCell><TableCell className="max-w-[150px] truncate font-medium">{contract.name}</TableCell><TableCell>{contract.customer}</TableCell><TableCell>{contract.contractDate}</TableCell><TableCell className="text-sm">{contract.startDate} ~ {contract.endDate}</TableCell><TableCell className="text-right font-medium">₩{parseInt(contract.amount).toLocaleString()}</TableCell><TableCell>{contract.maintenanceEnd}</TableCell><TableCell><Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{contract.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="licenses"><Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">라이선스 목록</CardTitle><Badge variant="secondary">{filteredLicenses.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[120px]">라이선스번호</TableHead><TableHead>계약번호</TableHead><TableHead>고객사</TableHead><TableHead>제품</TableHead><TableHead>모듈</TableHead><TableHead className="text-center">수량</TableHead><TableHead>유형</TableHead><TableHead>발급일</TableHead><TableHead>만료일</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>{filteredLicenses.map((license) => <TableRow key={license.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/contract/licenses/${license.id}`)}><TableCell className="font-mono text-sm">{license.id}</TableCell><TableCell className="font-mono text-sm">{license.contractId}</TableCell><TableCell className="font-medium">{license.customer}</TableCell><TableCell>{license.product}</TableCell><TableCell>{license.module}</TableCell><TableCell className="text-center">{license.quantity}</TableCell><TableCell><Badge variant={license.type === "영구" ? "default" : "outline"}>{license.type}</Badge></TableCell><TableCell>{license.issueDate}</TableCell><TableCell>{license.expiryDate}</TableCell><TableCell><Badge variant={license.status === "발급완료" ? "default" : "secondary"} className={license.status === "발급완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-blue-100 text-blue-700 hover:bg-blue-100"}>{license.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      </Tabs></main></div></div>
  )
}
