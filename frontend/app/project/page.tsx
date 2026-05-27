"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Receipt, TrendingUp, Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { FilterPopover } from "@/components/erp/filter-popover";
import { PageSearchForm } from "@/components/erp/page-search-form";
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils";
import { ProjectResultForm } from "@/components/erp/project/project-result-form";
import { BillingRequestForm } from "@/components/erp/project/billing-request-form";
import { projectApi, type ProjectListResponse, type BillingListResponse, type BillingDetailResponse } from "@/lib/api/project-api";

type ProjectTab = "results" | "billingAndCollection" | "revenue";

function isProjectTab(value: string | null): value is ProjectTab {
  return value === "results" || value === "billingAndCollection" || value === "revenue";
}

export default function ProjectPage() {
  const router = useRouter();

  // 탭 / 생성 상태
  const [activeTab, setActiveTab] = useState<ProjectTab>("results");
  const [isCreating, setIsCreating] = useState(false);

  // 검색 / 필터
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");

  // 사업 목록 상태
  const [projects, setProjects] = useState<ProjectListResponse[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // 청구 목록 상태
  const [billings, setBillings] = useState<BillingListResponse[]>([]);
  const [billingsLoading, setBillingsLoading] = useState(false);
  const [billingsError, setBillingsError] = useState<string | null>(null);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (isProjectTab(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // 데이터 페칭
  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await projectApi.getProjects();
      setProjects(res.data ?? []);
    } catch {
      setProjectsError("사업 목록을 불러오는 데 실패했습니다.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const fetchBillings = useCallback(async () => {
    setBillingsLoading(true);
    setBillingsError(null);
    try {
      const res = await projectApi.getBillings();
      setBillings(res.data ?? []);
    } catch {
      setBillingsError("청구 목록을 불러오는 데 실패했습니다.");
    } finally {
      setBillingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (activeTab === "billingAndCollection") {
      fetchBillings();
    }
  }, [activeTab, fetchBillings]);

  // 예상 매출액 상태
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const hasAutoSetYear = useRef(false);
  const [expectedRevenue, setExpectedRevenue] = useState<any[]>([]);
  const [totalEms, setTotalEms] = useState(0);
  const [totalItg, setTotalItg] = useState(0);
  const [totalIot, setTotalIot] = useState(0);
  const [totalOther, setTotalOther] = useState(0);
  const [totalEmsMaint, setTotalEmsMaint] = useState(0);
  const [totalItgMaint, setTotalItgMaint] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const res = await projectApi.getAnnualRevenue(selectedYear);
      const data = res.data ?? [];

      const y = selectedYear;
      type MonthRow = { month: string; ems: number; itg: number; iot: number; other: number; emsMaint: number; itgMaint: number };
      const monthlyData: Record<string, MonthRow> = {};
      for (let i = 1; i <= 12; i++) {
        const monthStr = `${y}-${String(i).padStart(2, "0")}`;
        monthlyData[monthStr] = { month: monthStr, ems: 0, itg: 0, iot: 0, other: 0, emsMaint: 0, itgMaint: 0 };
      }

      // 백엔드 ProductCategory enum → 프론트 필드 매핑
      // IOT = 수주보고서 aiotionSummary (DATACENTER·RCA·DCA 라이선스 합계)
      // ETC = itoSummary + otherSummary + dashboardSummary
      data.forEach((categoryData) => {
        const cat = categoryData.productCategory;
        const monthlyRevenue = categoryData.monthlyRevenue ?? {};
        Object.entries(monthlyRevenue).forEach(([month, amount]) => {
          if (!monthlyData[month]) return;
          const value = Number(amount) || 0;
          if (cat === "EMS") monthlyData[month].ems += value;
          else if (cat === "ITG") monthlyData[month].itg += value;
          else if (cat === "IOT") monthlyData[month].iot += value;
          else if (cat === "ETC") monthlyData[month].other += value;
          else if (cat === "EMS_MAINTENANCE") monthlyData[month].emsMaint += value;
          else if (cat === "ITG_MAINTENANCE") monthlyData[month].itgMaint += value;
        });
      });

      const revenueList = Object.values(monthlyData);

      let tEms = 0,
        tItg = 0,
        tIot = 0,
        tOther = 0,
        tEmsMaint = 0,
        tItgMaint = 0,
        tTotal = 0;
      revenueList.forEach((row) => {
        tEms += row.ems;
        tItg += row.itg;
        tIot += row.iot;
        tOther += row.other;
        tEmsMaint += row.emsMaint;
        tItgMaint += row.itgMaint;
        tTotal += row.ems + row.itg + row.iot + row.other + row.emsMaint + row.itgMaint;
      });

      setExpectedRevenue(revenueList);
      setTotalEms(tEms);
      setTotalItg(tItg);
      setTotalIot(tIot);
      setTotalOther(tOther);
      setTotalEmsMaint(tEmsMaint);
      setTotalItgMaint(tItgMaint);
      setTotalRevenue(tTotal);
    } catch (e) {
      console.error(e);
      setRevenueError("예상 매출액 데이터를 불러오는 데 실패했습니다.");
    } finally {
      setRevenueLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (activeTab === "revenue") {
      fetchRevenue();
    }
  }, [activeTab, fetchRevenue]);

  useEffect(() => {
    if (!hasAutoSetYear.current && projects.length > 0) {
      hasAutoSetYear.current = true;
      const projectYears = projects.filter((p) => p.startDate).map((p) => parseInt(p.startDate!.substring(0, 4)));
      if (projectYears.length > 0) {
        const maxYear = Math.max(...projectYears);
        if (maxYear >= 2023 && maxYear <= 2028) {
          setSelectedYear(maxYear);
        }
      }
    }
  }, [projects]);

  // 검색 / 필터 적용
  const normalizedSearch = appliedSearchTerm.trim().toLowerCase();
  const matchesSearch = (values: Array<string | number | null | undefined>) => {
    if (!normalizedSearch) return true;
    return values
      .filter((v) => v != null)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  };

  // 사업 필터
  const filteredProjects = projects
    .filter((p) => matchesSearch([p.customerName, p.projectName, p.pmName, p.salesRepresentativeName]))
    .sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

  // 청구 필터
  const filteredBillings = billings
    .filter((b) => matchesSearch([b.customerName, b.projectName, b.salesRepName, b.requesterName]))
    .sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const getBillingStatusInfo = (item: BillingListResponse) => {
    const raw = (item as any).status;
    let key: string;

    if (typeof raw === "string" && raw) {
      const u = raw.toUpperCase();
      if (u === "REQUESTED" || raw === "발행 요청" || raw === "결재 요청 중") key = "REQUESTED";
      else if (u === "APPROVED" || raw === "결재 완료") key = "APPROVED";
      else if (u === "ISSUED" || raw === "발행 완료") key = "ISSUED";
      else if (u === "COLLECTED" || raw === "수금 완료") key = "COLLECTED";
      else key = u;
    } else if (typeof raw === "number") {
      key = (["REQUESTED", "APPROVED", "ISSUED", "COLLECTED"] as const)[raw] ?? "REQUESTED";
    } else {
      // status 필드가 없을 경우 날짜 값으로 추론
      if (item.collectedAt) key = "COLLECTED";
      else if (item.issuedAt) key = "ISSUED";
      else key = "REQUESTED";
    }

    switch (key) {
      case "COLLECTED":
        return { label: "수금 완료", className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700" };
      case "ISSUED":
        return { label: "발행 완료", className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700" };
      case "APPROVED":
        return { label: "결재 완료", className: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-700" };
      default:
        return { label: "결재 요청 중", className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700" };
    }
  };

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
                    {activeTab !== "revenue" && <PageSearchForm value={searchTerm} onChange={setSearchTerm} onSearch={() => setAppliedSearchTerm(searchTerm)} />}
                    <FilterPopover title="사업" statusOptions={["REQUESTED", "ISSUED", "COLLECTED"]} value={filters} onApply={setFilters} fieldOptions={[]} />
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

            {/* 결과보고 탭 */}
            <TabsContent value="results">
              {!isCreating ? (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">사업 현황</CardTitle>
                      <Badge variant="secondary">{filteredProjects.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {projectsLoading ? (
                      <div className="flex justify-center items-center py-16 gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        불러오는 중...
                      </div>
                    ) : projectsError || filteredProjects.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 사업 결과보고 내역이 없습니다.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>고객사</TableHead>
                            <TableHead>사업명</TableHead>
                            <TableHead className="text-right">사업금액</TableHead>
                            <TableHead>사업개시일</TableHead>
                            <TableHead>사업완료일</TableHead>
                            <TableHead>PM</TableHead>
                            <TableHead>영업대표</TableHead>
                            <TableHead className="text-center">결과보고</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProjects.map((project) => (
                            <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/project/results/${project.id}`)}>
                              <TableCell>{project.customerName ?? "-"}</TableCell>
                              <TableCell className="font-medium max-w-[150px] truncate">{project.projectName ?? "-"}</TableCell>
                              <TableCell className="text-right font-medium">{project.totalAmount != null ? `₩${project.totalAmount.toLocaleString()}` : "-"}</TableCell>
                              <TableCell className="text-sm">{project.startDate ?? "-"}</TableCell>
                              <TableCell className="text-sm">{project.endDate ?? "-"}</TableCell>
                              <TableCell>{project.pmName ?? "-"}</TableCell>
                              <TableCell>{project.salesRepresentativeName ?? "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={project.hasResultReport ? "default" : "outline"}>{project.hasResultReport ? "완료" : "미등록"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <ProjectResultForm
                  onSuccess={() => {
                    setIsCreating(false);
                    fetchProjects();
                  }}
                  onCancel={() => setIsCreating(false)}
                  inheritedData={{
                    customerId: "",
                    customerName: "",
                    opportunityId: "",
                    opportunityName: "",
                    orderReportId: "",
                    contractId: "",
                  }}
                />
              )}
            </TabsContent>

            {/* 청구 및 수금 현황 탭 */}
            <TabsContent value="billingAndCollection">
              {!isCreating ? (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">청구 및 수금 현황</CardTitle>
                      <Badge variant="secondary">{filteredBillings.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {billingsLoading ? (
                      <div className="flex justify-center items-center py-16 gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        불러오는 중...
                      </div>
                    ) : billingsError || filteredBillings.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 청구 및 수금 내역이 없습니다.</div>
                    ) : (
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
                            <TableHead className="text-center">상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBillings.map((item, idx) => (
                            <TableRow
                              key={item.id ?? idx}
                              className={item.id ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}
                              onClick={() => item.id && router.push(`/project/billingAndCollection/${item.id}`)}
                            >
                              <TableCell className="font-medium">{item.customerName}</TableCell>
                              <TableCell>{item.projectName}</TableCell>
                              <TableCell className="text-right font-medium">₩{item.billingAmount.toLocaleString()}</TableCell>
                              <TableCell>{item.issuedAt ?? "-"}</TableCell>
                              <TableCell>{item.collectedAt ?? "-"}</TableCell>
                              <TableCell>{item.salesRepName}</TableCell>
                              <TableCell>{item.requesterName}</TableCell>
                              <TableCell className="text-center">
                                {(() => {
                                  const { label, className } = getBillingStatusInfo(item);
                                  return (
                                    <Badge variant="outline" className={className}>
                                      {label}
                                    </Badge>
                                  );
                                })()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <BillingRequestForm
                  onSuccess={() => {
                    setIsCreating(false);
                    fetchBillings();
                  }}
                  onCancel={() => setIsCreating(false)}
                  inheritedData={{
                    customerId: "",
                    customerName: "",
                    opportunityId: "",
                    opportunityName: "",
                    orderReportId: "",
                    contractId: "",
                    projectName: "",
                  }}
                />
              )}
            </TabsContent>

            {/* 예상 매출액 탭 */}
            <TabsContent value="revenue">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">제품별/월별 예상 매출액</CardTitle>
                    <div className="flex items-center gap-3">
                      <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                        <SelectTrigger className="w-[120px] h-9">
                          <SelectValue placeholder="연도 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2023">2023년</SelectItem>
                          <SelectItem value="2024">2024년</SelectItem>
                          <SelectItem value="2025">2025년</SelectItem>
                          <SelectItem value="2026">2026년</SelectItem>
                          <SelectItem value="2027">2027년</SelectItem>
                          <SelectItem value="2028">2028년</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        연말 총 합계 ₩{Math.round(totalRevenue).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {revenueLoading ? (
                    <div className="flex justify-center items-center py-16 gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      불러오는 중...
                    </div>
                  ) : revenueError ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-destructive">
                      <AlertCircle className="w-6 h-6" />
                      <p className="text-sm">{revenueError}</p>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={fetchRevenue}>
                        <RefreshCw className="w-3 h-3" /> 다시 시도
                      </button>
                    </div>
                  ) : expectedRevenue.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 예상 매출액이 없습니다.</div>
                  ) : (
                    <div className="space-y-4">
                      {totalRevenue === 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-amber-800">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm">{selectedYear}년도 예상 매출액 합계가 ₩0입니다.</p>
                              <ul className="text-xs text-amber-700 mt-1.5 space-y-1 list-disc list-inside">
                                <li>
                                  수주보고서 상태가 <strong>승인완료</strong> 상태여야 합니다.
                                </li>
                                <li>
                                  수주보고서의 계약 기간이 <strong>{selectedYear}년도와 겹쳐야</strong> 합니다.
                                </li>
                                <li>
                                  수주보고서에 <strong>0원을 초과하는 제품 금액</strong>이 등록되어 있어야 합니다.
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[80px] font-semibold text-center">월</TableHead>
                            <TableHead className="text-right font-semibold">EMS</TableHead>
                            <TableHead className="text-right font-semibold">ITG</TableHead>
                            <TableHead className="text-right font-semibold">AIOTION</TableHead>
                            <TableHead className="text-right font-semibold">기타</TableHead>
                            <TableHead className="text-right font-semibold">EMS 유지보수</TableHead>
                            <TableHead className="text-right font-semibold">ITG 유지보수</TableHead>
                            <TableHead className="text-right font-semibold text-primary">월별 합계</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expectedRevenue.map((row) => {
                            const monthTotal = row.ems + row.itg + row.iot + row.other + row.emsMaint + row.itgMaint;
                            const fmtAmt = (v: number) => (v === 0 ? "-" : `₩${Math.round(v).toLocaleString()}`);
                            const monthNum = parseInt(row.month.split("-")[1]);
                            return (
                              <TableRow key={row.month} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-center">{monthNum}월</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtAmt(row.ems)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtAmt(row.itg)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtAmt(row.iot)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtAmt(row.other)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtAmt(row.emsMaint)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtAmt(row.itgMaint)}</TableCell>
                                <TableCell className={`text-right font-bold bg-primary/5 ${monthTotal === 0 ? "text-muted-foreground" : "text-primary"}`}>
                                  {monthTotal === 0 ? "-" : `₩${Math.round(monthTotal).toLocaleString()}`}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-muted font-bold hover:bg-muted">
                            <TableCell className="text-center">연간 합계</TableCell>
                            <TableCell className="text-right">{totalEms === 0 ? "-" : `₩${Math.round(totalEms).toLocaleString()}`}</TableCell>
                            <TableCell className="text-right">{totalItg === 0 ? "-" : `₩${Math.round(totalItg).toLocaleString()}`}</TableCell>
                            <TableCell className="text-right">{totalIot === 0 ? "-" : `₩${Math.round(totalIot).toLocaleString()}`}</TableCell>
                            <TableCell className="text-right">{totalOther === 0 ? "-" : `₩${Math.round(totalOther).toLocaleString()}`}</TableCell>
                            <TableCell className="text-right">{totalEmsMaint === 0 ? "-" : `₩${Math.round(totalEmsMaint).toLocaleString()}`}</TableCell>
                            <TableCell className="text-right">{totalItgMaint === 0 ? "-" : `₩${Math.round(totalItgMaint).toLocaleString()}`}</TableCell>
                            <TableCell className="text-right text-primary text-lg">₩{Math.round(totalRevenue).toLocaleString()}</TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
