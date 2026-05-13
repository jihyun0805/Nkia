"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Receipt, TrendingUp, Plus, Loader2, AlertCircle } from "lucide-react";
import { FilterPopover } from "@/components/erp/filter-popover";
import { PageSearchForm } from "@/components/erp/page-search-form";
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils";
import { ProjectResultForm } from "@/components/erp/project/project-result-form";
import { BillingRequestForm } from "@/components/erp/project/billing-request-form";
import { projectApi, type ProjectListResponse, type BillingListResponse } from "@/lib/api/project-api";

export default function ProjectPage() {
  const router = useRouter();

  // 탭 / 생성 상태
  const [activeTab, setActiveTab] = useState<"results" | "billingAndCollection" | "revenue">("results");
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
  const [expectedRevenue, setExpectedRevenue] = useState<any[]>([]);
  const [totalEms, setTotalEms] = useState(0);
  const [totalItg, setTotalItg] = useState(0);
  const [totalIot, setTotalIot] = useState(0);
  const [totalOther, setTotalOther] = useState(0);
  const [totalEmsMaint, setTotalEmsMaint] = useState(0);
  const [totalItgMaint, setTotalItgMaint] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const res = await projectApi.getAnnualRevenue(2026);
      const data = res.data ?? [];

      const y = 2026;
      type MonthRow = { month: string; ems: number; itg: number; iot: number; other: number; emsMaint: number; itgMaint: number };
      const monthlyData: Record<string, MonthRow> = {};
      for (let i = 1; i <= 12; i++) {
        const monthStr = `${y}-${String(i).padStart(2, "0")}`;
        monthlyData[monthStr] = { month: monthStr, ems: 0, itg: 0, iot: 0, other: 0, emsMaint: 0, itgMaint: 0 };
      }

      data.forEach((categoryData) => {
        const cat = categoryData.productCategory;
        Object.entries(categoryData.monthlyRevenue).forEach(([month, amount]) => {
          if (!monthlyData[month]) return;
          if (cat === "EMS") monthlyData[month].ems += amount;
          else if (cat === "ITG") monthlyData[month].itg += amount;
          else if (cat === "IOT") monthlyData[month].iot += amount;
          else if (cat === "ETC") monthlyData[month].other += amount;
          else if (cat === "EMS_MAINTENANCE") monthlyData[month].emsMaint += amount;
          else if (cat === "ITG_MAINTENANCE") monthlyData[month].itgMaint += amount;
        });
      });

      const revenueList = Object.values(monthlyData).filter((row) => row.ems > 0 || row.itg > 0 || row.iot > 0 || row.other > 0 || row.emsMaint > 0 || row.itgMaint > 0);

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
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "revenue") {
      fetchRevenue();
    }
  }, [activeTab, fetchRevenue]);

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

  // 청구 필터 (status 없을 시 전체 표시, 있으면 ISSUED/COLLECTED만 표시)
  const filteredBillings = billings
    .filter((b) => !b.status || b.status === "ISSUED" || b.status === "COLLECTED")
    .filter((b) => matchesSearch([b.customerName, b.projectName, b.salesRepName, b.requesterName]))
    .sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const statusLabel = (status: string) => {
    if (status === "REQUESTED") return "요청";
    if (status === "ISSUED") return "발행완료";
    if (status === "COLLECTED") return "수금완료";
    return status;
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
                    ) : (projectsError || filteredProjects.length === 0) ? (
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
                    ) : (billingsError || filteredBillings.length === 0) ? (
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
                                <Badge variant={item.status === "COLLECTED" ? "default" : item.status === "ISSUED" ? "secondary" : "outline"}>
                                  {item.status ? statusLabel(item.status) : "발행완료"}
                                </Badge>
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
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      연말 총 합계 ₩{Math.round(totalRevenue).toLocaleString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {revenueLoading ? (
                    <div className="flex justify-center items-center py-16 gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      불러오는 중...
                    </div>
                  ) : expectedRevenue.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 예상 매출액이 없습니다.</div>
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[100px] font-semibold text-center">월</TableHead>
                        <TableHead className="text-right font-semibold">EMS</TableHead>
                        <TableHead className="text-right font-semibold">ITG</TableHead>
                        <TableHead className="text-right font-semibold">IoT</TableHead>
                        <TableHead className="text-right font-semibold">기타</TableHead>
                        <TableHead className="text-right font-semibold">EMS 유지보수</TableHead>
                        <TableHead className="text-right font-semibold">ITG 유지보수</TableHead>
                        <TableHead className="text-right font-semibold text-primary">월별 합계</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expectedRevenue.map((row) => {
                        const monthTotal = row.ems + row.itg + row.iot + row.other + row.emsMaint + row.itgMaint;
                        return (
                          <TableRow key={row.month} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-center">{row.month}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.ems).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.itg).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.iot).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.other).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.emsMaint).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₩{Math.round(row.itgMaint).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-bold text-primary bg-primary/5">₩{Math.round(monthTotal).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted font-bold hover:bg-muted">
                        <TableCell className="text-center">연말 합계</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalEms).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalItg).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalIot).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalOther).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalEmsMaint).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₩{Math.round(totalItgMaint).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-primary text-lg">₩{Math.round(totalRevenue).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
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
