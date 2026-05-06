"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/erp/sidebar"
import { Header } from "@/components/erp/header"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterPopover } from "@/components/erp/filter-popover"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { bidResults, bidStatuses, getBidCreateActionLabel, getProposals, getRfpAnalyses, prbList, subscribeProposalUpdates, subscribeRfpAnalysesUpdates } from "@/lib/bid-data"
import { getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import { type ActivityRequestRecord } from "@/lib/activity-data"
import { getOpportunities } from "@/lib/finding-data"
import { Plus, Search, FileText, ClipboardCheck, Presentation, Trophy } from "lucide-react"

type ProposalOverviewRow = {
  key: string
  requestId?: string
  proposalId?: string
  customer: string
  opportunity: string
  proposalType: "자체 제안" | "SI 제안"
  productGroup: string
  requestDate: string
  proposalDeadline: string
  status: "작성 중" | "완료"
  sortDate: string
}

export default function BidPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [activeTab, setActiveTab] = useState<"rfp" | "prb" | "proposal" | "result">("rfp")
  const [rfpItems, setRfpItems] = useState<ReturnType<typeof getRfpAnalyses>>([])
  const [proposalRequests, setProposalRequests] = useState<ActivityRequestRecord[]>([])
  const [proposals, setProposals] = useState<ReturnType<typeof getProposals>>([])
  const [proposalConfirmTarget, setProposalConfirmTarget] = useState<ProposalOverviewRow | null>(null)
  const q = searchTerm.toLowerCase()

  useEffect(() => {
    const sync = () => setRfpItems(getRfpAnalyses())
    sync()
    return subscribeRfpAnalysesUpdates(sync)
  }, [])

  useEffect(() => {
    const sync = () =>
      setProposalRequests(
        getActivityRequests().filter((item) => item.type === "제안서 작성" || item.type === "SI 제안서 작성"),
      )

    sync()
    return subscribeWorkflowUpdates(sync)
  }, [])

  useEffect(() => {
    const sync = () => setProposals(getProposals())

    sync()
    return subscribeProposalUpdates(sync)
  }, [])

  const opportunityMap = new Map(getOpportunities().map((item) => [item.id, item]))
  const getMatchedProposalRequest = (proposal: (typeof proposals)[number]) =>
    proposal.requestId
      ? proposalRequests.find((request) => request.id === proposal.requestId) ?? null
      : proposalRequests.find(
          (request) =>
            request.customerCode === proposal.customerCode &&
            request.opportunityCode === proposal.opportunityCode &&
            (request.type === "SI 제안서 작성" ? "SI 제안" : "자체 제안") === proposal.proposalType,
        ) ?? null

  const completedRequestIds = new Set(
    proposals
      .map((item) => getMatchedProposalRequest(item)?.id ?? item.requestId)
      .filter((value): value is string => Boolean(value)),
  )
  const pendingProposalRows: ProposalOverviewRow[] = proposalRequests
    .filter((request) => !completedRequestIds.has(request.id))
    .map((request) => ({
      key: `request-${request.id}`,
      requestId: request.id,
      customer: request.customer,
      opportunity: request.opportunity,
      proposalType: request.type === "SI 제안서 작성" ? ("SI 제안" as const) : ("자체 제안" as const),
      productGroup: opportunityMap.get(request.opportunityCode ?? "")?.product ?? "-",
      requestDate: request.date,
      proposalDeadline: request.dueDate,
      status: "작성 중" as const,
      sortDate: request.date,
    }))
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))

  const completedProposalRows: ProposalOverviewRow[] = proposals
    .map((proposal) => {
      const linkedRequest = getMatchedProposalRequest(proposal)

      return {
        key: `proposal-${proposal.id}`,
        proposalId: proposal.id,
        requestId: linkedRequest?.id,
        customer: proposal.customer,
        opportunity: proposal.opportunity,
        proposalType: proposal.proposalType,
        productGroup: proposal.productGroup,
        requestDate: proposal.requestDate || linkedRequest?.date || "-",
        proposalDeadline: proposal.proposalDeadline || linkedRequest?.dueDate || "-",
        status: "완료" as const,
        sortDate: proposal.createdAt,
      }
    })
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))

  const proposalOverviewRows = [...pendingProposalRows, ...completedProposalRows]

  const statusOptions = activeTab === "proposal" ? ["작성 중", "완료"] : bidStatuses
  const bidFieldOptions = activeTab === "rfp"
    ? [{ key: "customer", label: "고객사", options: uniqueOptions(rfpItems, (i) => i.customer) }]
    : activeTab === "prb"
    ? [
      { key: "customer", label: "고객사", options: uniqueOptions(prbList, (i) => i.customer) },
      { key: "riskLevel", label: "리스크", options: uniqueOptions(prbList, (i) => i.riskLevel) },
    ]
    : activeTab === "proposal"
      ? [{ key: "customer", label: "고객사", options: uniqueOptions(proposalOverviewRows, (i) => i.customer) }]
      : [
        { key: "customer", label: "고객사", options: uniqueOptions(bidResults, (i) => i.customer) },
        { key: "competitor", label: "경쟁사", options: uniqueOptions(bidResults, (i) => i.competitor) },
      ]
  const filteredRfpList = filterRecords(rfpItems, filters, { status: (i) => i.status, owner: (i) => i.analyst, date: (i) => i.receiveDate, fields: { customer: (i) => i.customer } })
    .filter((i) => [i.id, i.customer, i.opportunity, i.requester, i.analyst].join(" ").toLowerCase().includes(q))
    .sort((a, b) => new Date(b.receiveDate).getTime() - new Date(a.receiveDate).getTime())
  const filteredPrbList = filterRecords(prbList, filters, { status: (i) => i.result, owner: (i) => i.reviewer, date: (i) => i.submitDate, fields: { customer: (i) => i.customer, riskLevel: (i) => i.riskLevel } }).filter((i) => [i.id, i.name, i.customer, i.reviewer].join(" ").toLowerCase().includes(q))
  const filteredProposalList = filterRecords(proposalOverviewRows, filters, {
    status: (i) => i.status,
    owner: () => "",
    date: (i) => i.sortDate,
    fields: { customer: (i) => i.customer },
  }).filter((i) => [i.customer, i.opportunity, i.proposalType, i.productGroup, i.requestDate, i.proposalDeadline, i.status].join(" ").toLowerCase().includes(q))
  const filteredBidResults = filterRecords(bidResults, filters, { status: (i) => i.result, owner: (i) => i.salesRep, date: (i) => i.bidDate, fields: { customer: (i) => i.customer, competitor: (i) => i.competitor } }).filter((i) => [i.id, i.name, i.customer, i.salesRep].join(" ").toLowerCase().includes(q))

  const handleProposalRowClick = (proposal: ProposalOverviewRow) => {
    if (proposal.status === "완료" && proposal.proposalId) {
      router.push(`/bid/proposal/${proposal.proposalId}`)
      return
    }

    setProposalConfirmTarget(proposal)
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="입찰" description="RFP 분석, PRB 검토, 제안서 등록 및 입찰 결과를 관리합니다" />
          <main className="flex-1 overflow-auto p-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "rfp" | "prb" | "proposal" | "result")} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="rfp" className="gap-2"><FileText className="w-4 h-4" />RFP 분석</TabsTrigger>
                  <TabsTrigger value="prb" className="gap-2"><ClipboardCheck className="w-4 h-4" />PRB</TabsTrigger>
                  <TabsTrigger value="proposal" className="gap-2"><Presentation className="w-4 h-4" />제안서</TabsTrigger>
                  <TabsTrigger value="result" className="gap-2"><Trophy className="w-4 h-4" />입찰 결과</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="검색..." className="w-64 pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <FilterPopover title="입찰" statusOptions={statusOptions} value={filters} onApply={setFilters} fieldOptions={bidFieldOptions} />
                  <Button asChild>
                    <Link href={activeTab === "rfp" ? "/bid/new/rfp?standalone=1" : activeTab === "proposal" ? "/bid/new/proposal" : `/bid/new/${activeTab}`}>
                      <Plus className="mr-2 w-4 h-4" />
                      {getBidCreateActionLabel(activeTab)}
                    </Link>
                  </Button>
                </div>
              </div>

              <TabsContent value="rfp">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">RFP 분석 현황</CardTitle>
                      <Badge variant="secondary">{filteredRfpList.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객사</TableHead>
                          <TableHead>사업기회</TableHead>
                          <TableHead>요청자</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead>접수일</TableHead>
                          <TableHead>마감일</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRfpList.map((rfp) => (
                          <TableRow key={rfp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/bid/rfp/${rfp.id}`)}>
                            <TableCell>{rfp.customer}</TableCell>
                            <TableCell className="max-w-[260px] truncate font-medium">{rfp.opportunity}</TableCell>
                            <TableCell>{rfp.requester}</TableCell>
                            <TableCell>{rfp.analyst}</TableCell>
                            <TableCell>{rfp.receiveDate}</TableCell>
                            <TableCell>{rfp.dueDate}</TableCell>
                            <TableCell><Badge variant={rfp.status === "완료" ? "default" : rfp.status === "분석중" ? "secondary" : "outline"} className={rfp.status === "완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : rfp.status === "분석중" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>{rfp.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prb">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">PRB 목록</CardTitle>
                      <Badge variant="secondary">{filteredPrbList.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">PRB 번호</TableHead>
                          <TableHead>RFP 번호</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead>고객사</TableHead>
                          <TableHead>제출일</TableHead>
                          <TableHead>검토일</TableHead>
                          <TableHead>리스크</TableHead>
                          <TableHead>결과</TableHead>
                          <TableHead>검토자</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPrbList.map((prb) => (
                          <TableRow key={prb.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/bid/prb/${prb.id}`)}>
                            <TableCell className="font-mono text-sm">{prb.id}</TableCell>
                            <TableCell className="font-mono text-sm">{prb.rfpId}</TableCell>
                            <TableCell className="max-w-[200px] truncate font-medium">{prb.name}</TableCell>
                            <TableCell>{prb.customer}</TableCell>
                            <TableCell>{prb.submitDate}</TableCell>
                            <TableCell>{prb.reviewDate}</TableCell>
                            <TableCell><Badge variant={prb.riskLevel === "고" ? "destructive" : prb.riskLevel === "중" ? "secondary" : "outline"}>{prb.riskLevel}</Badge></TableCell>
                            <TableCell><Badge variant={prb.result === "승인" ? "default" : "outline"} className={prb.result === "승인" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>{prb.result}</Badge></TableCell>
                            <TableCell>{prb.reviewer}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="proposal">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">제안서 현황</CardTitle>
                      <Badge variant="secondary">{filteredProposalList.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객사명</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead>제안형태</TableHead>
                          <TableHead>제품군</TableHead>
                          <TableHead>요청일</TableHead>
                          <TableHead>제안서 마감일</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProposalList.map((proposal) => (
                          <TableRow key={proposal.key} className="cursor-pointer hover:bg-muted/50" onClick={() => handleProposalRowClick(proposal)}>
                            <TableCell>{proposal.customer}</TableCell>
                            <TableCell className="max-w-[240px] truncate font-medium">{proposal.opportunity}</TableCell>
                            <TableCell>{proposal.proposalType}</TableCell>
                            <TableCell>{proposal.productGroup}</TableCell>
                            <TableCell>{proposal.requestDate || "-"}</TableCell>
                            <TableCell>{proposal.proposalDeadline || "-"}</TableCell>
                            <TableCell><Badge className={proposal.status === "완료" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>{proposal.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="result">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">입찰 결과 목록</CardTitle>
                      <Badge variant="secondary">{filteredBidResults.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">입찰번호</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead>고객사</TableHead>
                          <TableHead>입찰일</TableHead>
                          <TableHead className="text-right">금액</TableHead>
                          <TableHead>경쟁사</TableHead>
                          <TableHead>결과</TableHead>
                          <TableHead>사유</TableHead>
                          <TableHead>담당자</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBidResults.map((bid) => (
                          <TableRow key={bid.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/bid/result/${bid.id}`)}>
                            <TableCell className="font-mono text-sm">{bid.id}</TableCell>
                            <TableCell className="max-w-[180px] truncate font-medium">{bid.name}</TableCell>
                            <TableCell>{bid.customer}</TableCell>
                            <TableCell>{bid.bidDate}</TableCell>
                            <TableCell className="text-right font-medium">{bid.amount}</TableCell>
                            <TableCell>{bid.competitor}</TableCell>
                            <TableCell><Badge variant={bid.result === "수주" ? "default" : "destructive"} className={bid.result === "수주" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>{bid.result}</Badge></TableCell>
                            <TableCell className="max-w-[150px] truncate">{bid.result === "수주" ? bid.winReason : bid.loseReason}</TableCell>
                            <TableCell>{bid.salesRep}</TableCell>
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
      <AlertDialog open={Boolean(proposalConfirmTarget)} onOpenChange={(open) => { if (!open) setProposalConfirmTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제안서가 등록되지 않았습니다.</AlertDialogTitle>
            <AlertDialogDescription>제안서가 등록되지 않았습니다. 제안서 등록을 진행하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href={proposalConfirmTarget?.requestId ? `/bid/new/proposal?requestId=${proposalConfirmTarget.requestId}` : "/bid/new/proposal"}>
                확인
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
