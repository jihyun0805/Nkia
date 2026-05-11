"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Receipt, Wallet, TrendingUp, Plus } from "lucide-react";
import { FilterPopover } from "@/components/erp/filter-popover";
import { PageSearchForm } from "@/components/erp/page-search-form";
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils";
import { billingAndCollections, projectResults } from "@/lib/project-data";
import { orderReports, contracts } from "@/lib/contract-data";
import { ProjectResultForm } from "@/components/erp/project/project-result-form";
import { BillingRequestForm } from "@/components/erp/project/billing-request-form";

export default function ProjectPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"results" | "billingAndCollection" | "revenue">("results");
  const [isCreating, setIsCreating] = useState(false);

  const { expectedRevenue, totalEms, totalItsm, totalAutomation, totalWss, totalRevenue } = useMemo(() => {
    const y = 2026; // Data base year
    const monthlyData: Record<string, { month: string; ems: number; itsm: number; automation: number; wss: number }> = {};
    for (let i = 1; i <= 12; i++) {
      const monthStr = `${y}-${String(i).padStart(2, "0")}`;
      monthlyData[monthStr] = { month: monthStr, ems: 0, itsm: 0, automation: 0, wss: 0 };
    }

    contracts.forEach(contract => {
      const order = orderReports.find(o => o.id === contract.orderId);
      if (!order) return;
      
      let productKey: "ems" | "itsm" | "automation" | "wss" = "wss";
      const prodName = order.product.toLowerCase();
      if (prodName.includes("ems")) productKey = "ems";
      else if (prodName.includes("itsm")) productKey = "itsm";
      else if (prodName.includes("automation")) productKey = "automation";

      const amount = parseInt(contract.amount.replace(/,/g, ""));
      const start = new Date(contract.startDate);
      const end = new Date(contract.endDate);
      
      const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const dailyAmount = amount / totalDays;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === y) {
          const monthStr = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyData[monthStr]) {
            monthlyData[monthStr][productKey] += dailyAmount;
          }
        }
      }
    });

    const revenueList = Object.values(monthlyData).filter(
      row => row.ems > 0 || row.itsm > 0 || row.automation > 0 || row.wss > 0
    );

    let tEms = 0, tItsm = 0, tAutomation = 0, tWss = 0, tTotal = 0;
    revenueList.forEach(row => {
      tEms += row.ems;
      tItsm += row.itsm;
      tAutomation += row.automation;
      tWss += row.wss;
      tTotal += row.ems + row.itsm + row.automation + row.wss;
    });

    return { 
      expectedRevenue: revenueList, 
      totalEms: tEms, 
      totalItsm: tItsm, 
      totalAutomation: tAutomation, 
      totalWss: tWss, 
      totalRevenue: tTotal 
    };
  }, []);
  const projectFieldOptions =
    activeTab === "billingAndCollection"
      ? [{ key: "customer", label: "고객사", options: uniqueOptions(billingAndCollections, (item) => item.customer) }]
      : [{ key: "customer", label: "고객사", options: uniqueOptions(projectResults, (item) => item.customer) }];

  const normalizedSearchTerm = appliedSearchTerm.trim().toLowerCase();
  const matchesSearch = (values: Array<string | number | null | undefined>) => {
    if (!normalizedSearchTerm) return true;
    return values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchTerm);
  };

  const filteredProjectResults = filterRecords(projectResults, filters, { owner: (item) => item.pm, date: (item) => item.registeredAt, fields: { customer: (item) => item.customer } })
    .filter((item) =>
      matchesSearch([item.id, item.customer, item.name, item.amount, item.startDate, item.endDate, item.pm, item.salesRep]),
    )
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

  const filteredBillingAndCollections = filterRecords(billingAndCollections, filters, { date: (item) => item.issueDate, fields: { customer: (item) => item.customer } })
    .filter((item) => item.approvalStatus === "승인완료")
    .filter((item) =>
      matchesSearch([
        item.id,
        item.customer,
        item.projectName,
        item.amount,
        item.issueDate,
        item.collectionDate,
        item.salesRep,
        item.requester,
        item.approvalStatus,
      ]),
    )
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

  const projectStatuses = ["진행중", "완료", "발행완료", "수금완료", "대기", "승인완료"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="사업" description="사업 결과보고, 청구 및 수금을 관리합니다" />
        <main className="flex-1 p-6 overflow-auto">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "results" | "billingAndCollection" | "revenue");
              setIsCreating(false);
            }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="results" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  결과보고
                </TabsTrigger>
                <TabsTrigger value="billingAndCollection" className="gap-2">
                  <Receipt className="w-4 h-4" />
                  청구 및 수금 현황
                </TabsTrigger>
                <TabsTrigger value="revenue" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  예상 매출액
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {!isCreating ? (
                  <>
                    {activeTab !== "revenue" && (
                      <PageSearchForm
                        value={searchTerm}
                        onChange={setSearchTerm}
                        onSearch={() => setAppliedSearchTerm(searchTerm)}
                      />
                    )}
                    <FilterPopover title="사업" statusOptions={projectStatuses} value={filters} onApply={setFilters} fieldOptions={projectFieldOptions} />
                    {activeTab === "results" && (
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 w-4 h-4" /> 사업결과보고 등록
                      </Button>
                    )}
                    {activeTab === "billingAndCollection" && (
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
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">사업 현황</CardTitle>
                      <Badge variant="secondary">{filteredProjectResults.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">사업번호</TableHead>
                          <TableHead>고객사</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead className="text-right">사업금액</TableHead>
                          <TableHead>사업개시일</TableHead>
                          <TableHead>사업완료일</TableHead>
                          <TableHead>PM</TableHead>
                          <TableHead>영업대표</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjectResults.map((project) => (
                          <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/project/results/${project.id}`)}>
                            <TableCell className="font-mono text-sm">{project.id}</TableCell>
                            <TableCell>{project.customer}</TableCell>
                            <TableCell className="font-medium max-w-[150px] truncate">{project.name}</TableCell>
                            <TableCell className="text-right font-medium">₩{project.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-sm">{project.startDate}</TableCell>
                            <TableCell className="text-sm">{project.endDate}</TableCell>
                            <TableCell>{project.pm}</TableCell>
                            <TableCell>{project.salesRep}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
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
                    contractId: "CTR-2026-001",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="billingAndCollection">
              {!isCreating ? (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">청구 및 수금 현황</CardTitle>
                      <Badge variant="secondary">{filteredBillingAndCollections.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객사</TableHead>
                          <TableHead>사업명</TableHead>
                          <TableHead className="text-right">청구금액</TableHead>
                          <TableHead>세금계산서 발행일</TableHead>
                          <TableHead>수금일</TableHead>
                          <TableHead>영업대표</TableHead>
                          <TableHead>요청자</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBillingAndCollections.map((item) => (
                          <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/project/billingAndCollection/${item.id}`)}>
                            <TableCell className="font-medium">{item.customer}</TableCell>
                            <TableCell>{item.projectName}</TableCell>
                            <TableCell className="text-right font-medium">₩{parseInt(item.amount.replace(/,/g, "")).toLocaleString()}</TableCell>
                            <TableCell>{item.issueDate}</TableCell>
                            <TableCell>{item.collectionDate}</TableCell>
                            <TableCell>{item.salesRep}</TableCell>
                            <TableCell>{item.requester}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
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
                    projectName: "삼성전자 EMS 구축 사업",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="revenue">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">제품별/월별 예상 매출액</CardTitle>
                    <Badge variant="secondary" className="text-sm px-3 py-1">연말 총 합계 ₩{Math.round(totalRevenue).toLocaleString()}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[120px] font-semibold text-center">월</TableHead>
                        <TableHead className="text-right font-semibold">EMS</TableHead>
                        <TableHead className="text-right font-semibold">ITSM</TableHead>
                        <TableHead className="text-right font-semibold">Automation</TableHead>
                        <TableHead className="text-right font-semibold">WSS</TableHead>
                        <TableHead className="text-right font-semibold text-primary">월별 합계</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expectedRevenue.map((row) => {
                        const monthTotal = row.ems + row.itsm + row.automation + row.wss;
                        return (
                          <TableRow key={row.month} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-center">{row.month}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.ems).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.itsm).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.automation).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.wss).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-bold text-primary bg-primary/5">₩{Math.round(monthTotal).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted font-bold hover:bg-muted">
                        <TableCell className="text-center">연말 합계</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalEms).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalItsm).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalAutomation).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalWss).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-primary text-lg">₩{Math.round(totalRevenue).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
