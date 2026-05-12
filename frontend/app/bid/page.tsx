"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterPopover } from "@/components/erp/filter-popover"
import { PageSearchForm } from "@/components/erp/page-search-form"
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils"
import { bidStatuses, getBidCreateActionLabel, getBidResults, getPrbResults, getProposals, getPrbs, getRfpAnalyses, subscribeBidResultUpdates, subscribePrbResultUpdates, subscribePrbUpdates, subscribeProposalUpdates, subscribeRfpAnalysesUpdates } from "@/lib/bid-data"
import { getActivityRequests, subscribeWorkflowUpdates } from "@/lib/activity-request-workflow"
import { type ActivityRequestRecord } from "@/lib/activity-data"
import { getOpportunities } from "@/lib/finding-data"
import { Plus, FileText, ClipboardCheck, Presentation, Trophy, ClipboardList } from "lucide-react"

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

type BidResultOverviewRow = {
  key: string
  proposalId: string
  bidResultId?: string
  customer: string
  opportunity: string
  proposalType: "자체 제안" | "SI 제안"
  productGroup: string
  proposalDeadline: string
  bidResult: string
  salesRep: string
  status: "미정" | "수주" | "실주"
  sortDate: string
}

type PrbResultOverviewRow = {
  key: string
  prbResultId: string
  customer: string
  opportunity: string
  proposalDeadline: string
  createdDate: string
  author: string
  sortDate: string
}

const BID_ACTIVE_TAB_STORAGE_KEY = "orbis.bid.active-tab"

function BidPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues)
  const [searchTerm, setSearchTerm] = useState("")
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"rfp" | "prb" | "prb-result" | "proposal" | "result">("rfp")
  const [rfpItems, setRfpItems] = useState<ReturnType<typeof getRfpAnalyses>>([])
  const [prbItems, setPrbItems] = useState<ReturnType<typeof getPrbs>>([])
  const [prbResultItems, setPrbResultItems] = useState<ReturnType<typeof getPrbResults>>([])
  const [proposalRequests, setProposalRequests] = useState<ActivityRequestRecord[]>([])
  const [proposals, setProposals] = useState<ReturnType<typeof getProposals>>([])
  const [results, setResults] = useState<ReturnType<typeof getBidResults>>([])
  const [proposalConfirmTarget, setProposalConfirmTarget] = useState<ProposalOverviewRow | null>(null)
  const [resultConfirmTarget, setResultConfirmTarget] = useState<BidResultOverviewRow | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const queryTab = searchParams.get("tab")
    if (queryTab === "rfp" || queryTab === "prb" || queryTab === "prb-result" || queryTab === "proposal" || queryTab === "result") {
      setActiveTab(queryTab)
      window.sessionStorage.setItem(BID_ACTIVE_TAB_STORAGE_KEY, queryTab)
      return
    }

    const storedTab = window.sessionStorage.getItem(BID_ACTIVE_TAB_STORAGE_KEY)
    if (storedTab === "rfp" || storedTab === "prb" || storedTab === "prb-result" || storedTab === "proposal" || storedTab === "result") {
      setActiveTab(storedTab)
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(BID_ACTIVE_TAB_STORAGE_KEY, activeTab)
  }, [activeTab])

  const buildBidHref = (pathname: string) => `${pathname}?tab=${activeTab}`

  useEffect(() => {
    const sync = () => setRfpItems(getRfpAnalyses())
    sync()
    return subscribeRfpAnalysesUpdates(sync)
  }, [])

  useEffect(() => {
    const sync = () => setPrbItems(getPrbs())
    sync()
    return subscribePrbUpdates(sync)
  }, [])

  useEffect(() => {
    const sync = () => setPrbResultItems(getPrbResults())
    sync()
    return subscribePrbResultUpdates(sync)
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

  useEffect(() => {
    const sync = () => setResults(getBidResults())

    sync()
    return subscribeBidResultUpdates(sync)
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
  const resultByProposalId = new Map(results.map((result) => [result.proposalId, result]))

  const pendingBidResultRows: BidResultOverviewRow[] = proposals
    .filter((proposal) => !resultByProposalId.has(proposal.id))
    .map((proposal) => ({
      key: `proposal-pending-result-${proposal.id}`,
      proposalId: proposal.id,
      customer: proposal.customer,
      opportunity: proposal.opportunity,
      proposalType: proposal.proposalType,
      productGroup: proposal.productGroup,
      proposalDeadline: proposal.proposalDeadline,
      bidResult: "-",
      salesRep: proposal.salesRep,
      status: "미정" as const,
      sortDate: proposal.createdAt,
    }))
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))

  const completedBidResultRows: BidResultOverviewRow[] = results
    .map((result) => ({
      key: `bid-result-${result.id}`,
      proposalId: result.proposalId,
      bidResultId: result.id,
      customer: result.customer,
      opportunity: result.opportunity,
      proposalType: result.proposalType,
      productGroup: result.productGroup,
      proposalDeadline: result.proposalDeadline,
      bidResult: result.result,
      salesRep: result.salesRep,
      status: result.result,
      sortDate: result.createdAt,
    }))
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))

  const bidResultOverviewRows = [...pendingBidResultRows, ...completedBidResultRows]
  const prbResultOverviewRows: PrbResultOverviewRow[] = prbResultItems
    .map((item) => ({
      key: `prb-result-${item.id}`,
      prbResultId: item.id,
      customer: item.customer,
      opportunity: item.opportunity,
      proposalDeadline: item.proposalDeadline,
      createdDate: item.createdDate,
      author: item.author,
      sortDate: item.createdAt,
    }))
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))

  const statusOptions = activeTab === "proposal"
    ? ["작성 중", "완료"]
    : activeTab === "prb"
      ? ["작성 중", "검토 중", "승인", "반려"]
      : bidStatuses
  const bidFieldOptions = activeTab === "rfp"
    ? [{ key: "customer", label: "고객사", options: uniqueOptions(rfpItems, (i) => i.customer) }]
    : activeTab === "prb"
    ? [{ key: "customer", label: "고객사", options: uniqueOptions(prbItems, (i) => i.customer) }]
    : activeTab === "prb-result"
      ? [{ key: "customer", label: "고객사", options: uniqueOptions(prbResultOverviewRows, (i) => i.customer) }]
    : activeTab === "proposal"
      ? [{ key: "customer", label: "고객사", options: uniqueOptions(proposalOverviewRows, (i) => i.customer) }]
      : [
        { key: "customer", label: "고객사", options: uniqueOptions(bidResultOverviewRows, (i) => i.customer) },
        { key: "proposalType", label: "제안형태", options: uniqueOptions(bidResultOverviewRows, (i) => i.proposalType) },
        { key: "productGroup", label: "제품군", options: uniqueOptions(bidResultOverviewRows, (i) => i.productGroup) },
      ]
  const normalizedSearchTerm = appliedSearchTerm.trim().toLowerCase()
  const matchesSearch = (values: Array<string | number | null | undefined>) => {
    if (!normalizedSearchTerm) return true
    return values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchTerm)
  }
  const filteredRfpList = filterRecords(rfpItems, filters, { status: (i) => i.status, owner: (i) => i.analyst, date: (i) => i.receiveDate, fields: { customer: (i) => i.customer } })
    .filter((i) => matchesSearch([i.id, i.customer, i.opportunity, i.requester, i.analyst, i.receiveDate, i.dueDate, i.status]))
    .sort((a, b) => new Date(b.receiveDate).getTime() - new Date(a.receiveDate).getTime())
  const filteredPrbList = filterRecords(prbItems, filters, {
    status: (i) => i.status,
    owner: (i) => i.author,
    date: (i) => i.createdDate,
    fields: { customer: (i) => i.customer },
  })
    .filter((i) => matchesSearch([i.id, i.customer, i.opportunity, i.proposalDeadline, i.createdDate, i.author, i.status]))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const filteredPrbResults = filterRecords(prbResultOverviewRows, filters, {
    owner: (i) => i.author,
    date: (i) => i.createdDate,
    fields: { customer: (i) => i.customer },
  })
    .filter((i) => matchesSearch([i.prbResultId, i.customer, i.opportunity, i.proposalDeadline, i.createdDate, i.author]))
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
  const filteredProposalList = filterRecords(proposalOverviewRows, filters, {
    status: (i) => i.status,
    owner: () => "",
    date: (i) => i.sortDate,
    fields: { customer: (i) => i.customer },
  }).filter((i) =>
    matchesSearch([
      i.requestId,
      i.proposalId,
      i.customer,
      i.opportunity,
      i.proposalType,
      i.productGroup,
      i.requestDate,
      i.proposalDeadline,
      i.status,
    ]),
  )
  const filteredBidResults = filterRecords(bidResultOverviewRows, filters, {
    status: (i) => i.status,
    owner: (i) => i.salesRep,
    date: (i) => i.sortDate.slice(0, 10),
    fields: {
      customer: (i) => i.customer,
      proposalType: (i) => i.proposalType,
      productGroup: (i) => i.productGroup,
    },
  }).filter((i) =>
    matchesSearch([
      i.proposalId,
      i.bidResultId,
      i.customer,
      i.opportunity,
      i.proposalType,
      i.productGroup,
      i.proposalDeadline,
      i.bidResult,
      i.salesRep,
      i.status,
    ]),
  )

  const handleProposalRowClick = (proposal: ProposalOverviewRow) => {
    if (proposal.status === "완료" && proposal.proposalId) {
      router.push(buildBidHref(`/bid/proposal/${proposal.proposalId}`))
      return
    }

    setProposalConfirmTarget(proposal)
  }

  const handleBidResultRowClick = (row: BidResultOverviewRow) => {
    if (row.bidResultId) {
      router.push(buildBidHref(`/bid/result/${row.bidResultId}`))
      return
    }

    setResultConfirmTarget(row)
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="입찰" description="RFP 분석, PRB 검토, 제안서 등록 및 입찰 결과를 관리합니다" />
          <main className="flex-1 overflow-auto p-6">
            <Tabs value={activeTab} onValueChange={(value) => {
              const nextTab = value as "rfp" | "prb" | "prb-result" | "proposal" | "result"
              setActiveTab(nextTab)
              router.replace(`/bid?tab=${nextTab}`, { scroll: false })
            }} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="rfp" className="gap-2"><FileText className="w-4 h-4" />RFP 분석</TabsTrigger>
                  <TabsTrigger value="prb" className="gap-2"><ClipboardCheck className="w-4 h-4" />PRB 현황</TabsTrigger>
                  <TabsTrigger value="prb-result" className="gap-2"><ClipboardList className="w-4 h-4" />PRB 결과</TabsTrigger>
                  <TabsTrigger value="proposal" className="gap-2"><Presentation className="w-4 h-4" />제안서</TabsTrigger>
                  <TabsTrigger value="result" className="gap-2"><Trophy className="w-4 h-4" />입찰결과현황</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <PageSearchForm
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onSearch={() => setAppliedSearchTerm(searchTerm)}
                  />
                  <FilterPopover
                    title="입찰"
                    statusOptions={statusOptions}
                    value={filters}
                    onApply={setFilters}
                    fieldOptions={bidFieldOptions}
                    ownerLabel={activeTab === "prb" || activeTab === "prb-result" ? "작성자" : activeTab === "result" ? "영업대표" : "담당자"}
                    showStatusFilter={activeTab !== "prb-result"}
                  />
                    <Button asChild>
                      <Link href={activeTab === "rfp" ? `/bid/new/rfp?standalone=1&tab=${activeTab}` : activeTab === "proposal" ? `/bid/new/proposal?tab=${activeTab}` : `/bid/new/${activeTab}?tab=${activeTab}`}>
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
                          <TableRow key={rfp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(buildBidHref(`/bid/rfp/${rfp.id}`))}>
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
                      <CardTitle className="text-lg">PRB 현황</CardTitle>
                      <Badge variant="secondary">{filteredPrbList.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객사</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead>제안서 마감일</TableHead>
                          <TableHead>작성일</TableHead>
                          <TableHead>작성자</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPrbList.map((prb) => (
                          <TableRow key={prb.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(buildBidHref(`/bid/prb/${prb.id}`))}>
                            <TableCell>{prb.customer}</TableCell>
                            <TableCell className="max-w-[240px] truncate font-medium">{prb.opportunity}</TableCell>
                            <TableCell>{prb.proposalDeadline}</TableCell>
                            <TableCell>{prb.createdDate}</TableCell>
                            <TableCell>{prb.author}</TableCell>
                            <TableCell>
                              <Badge
                                variant={prb.status === "승인" ? "default" : prb.status === "반려" ? "destructive" : "secondary"}
                                className={
                                  prb.status === "승인"
                                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                                    : prb.status === "반려"
                                      ? "bg-red-100 text-red-700 hover:bg-red-100"
                                      : prb.status === "검토 중"
                                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                }
                              >
                                {prb.status}
                              </Badge>
                            </TableCell>
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

              <TabsContent value="prb-result">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">PRB 결과 현황</CardTitle>
                      <Badge variant="secondary">{filteredPrbResults.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객사</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead>제안서 마감일</TableHead>
                          <TableHead>작성일</TableHead>
                          <TableHead>작성자</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPrbResults.map((prbResult) => (
                          <TableRow key={prbResult.key} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(buildBidHref(`/bid/prb-result/${prbResult.prbResultId}`))}>
                            <TableCell>{prbResult.customer}</TableCell>
                            <TableCell className="max-w-[240px] truncate font-medium">{prbResult.opportunity}</TableCell>
                            <TableCell>{prbResult.proposalDeadline}</TableCell>
                            <TableCell>{prbResult.createdDate}</TableCell>
                            <TableCell>{prbResult.author}</TableCell>
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
                      <CardTitle className="text-lg">입찰결과현황</CardTitle>
                      <Badge variant="secondary">{filteredBidResults.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객사</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead>제안형태</TableHead>
                          <TableHead>제품군</TableHead>
                          <TableHead>제안서 마감일</TableHead>
                          <TableHead>입찰 결과</TableHead>
                          <TableHead>영업대표</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBidResults.map((bid) => (
                          <TableRow key={bid.key} className="cursor-pointer hover:bg-muted/50" onClick={() => handleBidResultRowClick(bid)}>
                            <TableCell>{bid.customer}</TableCell>
                            <TableCell className="max-w-[240px] truncate font-medium">{bid.opportunity}</TableCell>
                            <TableCell>{bid.proposalType}</TableCell>
                            <TableCell>{bid.productGroup}</TableCell>
                            <TableCell>{bid.proposalDeadline || "-"}</TableCell>
                            <TableCell>{bid.bidResult}</TableCell>
                            <TableCell>{bid.salesRep}</TableCell>
                            <TableCell>
                              <Badge className={bid.status === "수주" ? "bg-green-100 text-green-700 hover:bg-green-100" : bid.status === "실주" ? "bg-rose-100 text-rose-700 hover:bg-rose-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                                {bid.status}
                              </Badge>
                            </TableCell>
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
              <Link href={proposalConfirmTarget?.requestId ? `/bid/new/proposal?requestId=${proposalConfirmTarget.requestId}&tab=${activeTab}` : `/bid/new/proposal?tab=${activeTab}`}>
                확인
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(resultConfirmTarget)} onOpenChange={(open) => { if (!open) setResultConfirmTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입찰 결과가 등록되지 않았습니다.</AlertDialogTitle>
            <AlertDialogDescription>입찰 결과가 등록되지 않았습니다. 입찰 결과 등록을 진행하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href={resultConfirmTarget?.proposalId ? `/bid/new/result?proposalId=${resultConfirmTarget.proposalId}&tab=${activeTab}` : `/bid/new/result?tab=${activeTab}`}>
                확인
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function BidPage() {
  return (
    <Suspense fallback={null}>
      <BidPageContent />
    </Suspense>
  )
}
