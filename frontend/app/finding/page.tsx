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
import { customers, findingStatuses, opportunities, partners } from "@/lib/finding-data"
import { Plus, Search, Building2, Users, Target } from "lucide-react"

export default function FindingPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [activeTab, setActiveTab] = useState<"opportunities" | "customers" | "partners">("opportunities")
  const q = searchTerm.toLowerCase()
  const findingFieldOptions = activeTab === "opportunities"
    ? [
      { key: "category", label: "고객군", options: uniqueOptions(opportunities, (i) => i.category) },
      { key: "product", label: "제품", options: uniqueOptions(opportunities, (i) => i.product) },
      { key: "customerCode", label: "고객 코드", options: uniqueOptions(opportunities, (i) => i.customerCode) },
      { key: "customer", label: "고객사", options: uniqueOptions(opportunities, (i) => i.customer) },
    ]
    : activeTab === "customers"
      ? [{ key: "category", label: "고객군", options: uniqueOptions(customers, (i) => i.category) }]
      : [{ key: "type", label: "협력사 유형", options: uniqueOptions(partners, (i) => i.type) }]
  const filteredOpportunities = filterRecords(opportunities, filters, { status: (i) => i.status, owner: (i) => i.salesRep, fields: { category: (i) => i.category, product: (i) => i.product, customerCode: (i) => i.customerCode, customer: (i) => i.customer } }).filter((i) => [i.id, i.customerCode, i.name, i.customer, i.partner, i.product, i.salesRep].join(" ").toLowerCase().includes(q))
  const filteredCustomers = filterRecords(customers, filters, { owner: (i) => i.contact, fields: { category: (i) => i.category } }).filter((i) => [i.id, i.name, i.contact, i.phone].join(" ").toLowerCase().includes(q))
  const filteredPartners = filterRecords(partners, filters, { owner: (i) => i.contact, fields: { type: (i) => i.type } }).filter((i) => [i.id, i.name, i.type, i.contact, i.phone].join(" ").toLowerCase().includes(q))
  return (
    <div className="min-h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col"><Header title="발굴" description="신규 고객 또는 신규 사업기회를 최초로 인지하고 시스템에 등록합니다" />
      <main className="flex-1 overflow-auto p-6"><Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "opportunities" | "customers" | "partners")} className="space-y-6"><div className="flex items-center justify-between"><TabsList><TabsTrigger value="opportunities" className="gap-2"><Target className="w-4 h-4" />사업기회 현황</TabsTrigger><TabsTrigger value="customers" className="gap-2"><Building2 className="w-4 h-4" />고객사 현황</TabsTrigger><TabsTrigger value="partners" className="gap-2"><Users className="w-4 h-4" />협력사 현황</TabsTrigger></TabsList><div className="flex items-center gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="검색..." className="w-64 pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><FilterPopover title="발굴" statusOptions={findingStatuses} value={filters} onApply={setFilters} ownerLabel="담당자" fieldOptions={findingFieldOptions} /><Button asChild><Link href="/finding/new"><Plus className="mr-2 w-4 h-4" />등록</Link></Button></div></div>
        <TabsContent value="opportunities" className="space-y-6">
          <Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">사업기회 목록</CardTitle><Badge variant="secondary">{filteredOpportunities.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[110px]">고객코드</TableHead><TableHead className="w-[120px]">사업코드</TableHead><TableHead>사업명</TableHead><TableHead>고객사</TableHead><TableHead>협력사</TableHead><TableHead>고객군</TableHead><TableHead>제품</TableHead><TableHead className="text-right">예상 예산/매출</TableHead><TableHead>예상시점</TableHead><TableHead>상태</TableHead><TableHead>담당자</TableHead></TableRow></TableHeader><TableBody>{filteredOpportunities.map((opp) => <TableRow key={opp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/finding/opportunities/${opp.id}`)}><TableCell className="font-mono text-sm">{opp.customerCode}</TableCell><TableCell className="font-mono text-sm">{opp.id}</TableCell><TableCell className="font-medium">{opp.name}</TableCell><TableCell>{opp.customer}</TableCell><TableCell>{opp.partner}</TableCell><TableCell><Badge variant={opp.category === "공공" ? "default" : opp.category === "해외" ? "secondary" : "outline"}>{opp.category}</Badge></TableCell><TableCell>{opp.product}</TableCell><TableCell className="text-right font-medium">{opp.expectedAmount}</TableCell><TableCell>{opp.expectedDate}</TableCell><TableCell><Badge variant={opp.status === "진행중" ? "default" : opp.status === "유망" ? "secondary" : "outline"} className={opp.status === "진행중" ? "bg-green-100 text-green-700 hover:bg-green-100" : opp.status === "유망" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : ""}>{opp.status}</Badge></TableCell><TableCell>{opp.salesRep}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </TabsContent>
        <TabsContent value="customers"><Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">고객사 목록</CardTitle><Badge variant="secondary">{filteredCustomers.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[100px]">고객사코드</TableHead><TableHead>고객사명</TableHead><TableHead>고객군</TableHead><TableHead className="text-center">진행중 사업기회</TableHead><TableHead className="text-center">계약 수</TableHead><TableHead>담당자</TableHead><TableHead>연락처</TableHead></TableRow></TableHeader><TableBody>{filteredCustomers.map((customer) => <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/finding/customers/${customer.id}`)}><TableCell className="font-mono text-sm">{customer.id}</TableCell><TableCell className="font-medium">{customer.name}</TableCell><TableCell><Badge variant={customer.category === "공공" ? "default" : customer.category === "해외" ? "secondary" : "outline"}>{customer.category}</Badge></TableCell><TableCell className="text-center">{customer.opportunities}</TableCell><TableCell className="text-center">{customer.contracts}</TableCell><TableCell>{customer.contact}</TableCell><TableCell>{customer.phone}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="partners"><Card><CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">협력사 목록</CardTitle><Badge variant="secondary">{filteredPartners.length}건</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[100px]">협력사코드</TableHead><TableHead>협력사명</TableHead><TableHead>유형</TableHead><TableHead className="text-center">진행중 사업기회</TableHead><TableHead className="text-center">진행중 프로젝트</TableHead><TableHead>담당자</TableHead><TableHead>연락처</TableHead></TableRow></TableHeader><TableBody>{filteredPartners.map((partner) => <TableRow key={partner.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/finding/partners/${partner.id}`)}><TableCell className="font-mono text-sm">{partner.id}</TableCell><TableCell className="font-medium">{partner.name}</TableCell><TableCell><Badge variant="outline">{partner.type}</Badge></TableCell><TableCell className="text-center">{partner.opportunities}</TableCell><TableCell className="text-center">{partner.projects}</TableCell><TableCell>{partner.contact}</TableCell><TableCell>{partner.phone}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      </Tabs></main></div></div>
  )
}
