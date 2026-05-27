"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ShieldCheck, HeadphonesIcon, AlertTriangle, Plus } from "lucide-react";
import { FilterPopover } from "@/components/erp/filter-popover";
import { PageSearchForm } from "@/components/erp/page-search-form";
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils";
import { getFreeMaintenanceList, getPaidMaintenanceList, getSupportHistoryList, MaintenanceListResponse, IntegratedSupportListResponse } from "@/lib/api/maintenance";
import { SupportRequestForm } from "@/components/erp/maintenance/support-request-form";
import { SupportResultForm } from "@/components/erp/maintenance/support-result-form";
import { FreeMaintenanceForm } from "@/components/erp/contract/free-maintenance-form";
import { PaidMaintenanceForm } from "@/components/erp/contract/paid-maintenance-form";

type MaintenanceTab = "free" | "paid" | "support";

function isMaintenanceTab(value: string | null): value is MaintenanceTab {
  return value === "free" || value === "paid" || value === "support";
}

export default function MaintenancePage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("free");
  const [creationMode, setCreationMode] = useState<"none" | "request" | "result" | "free" | "paid">("none");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [freeMaintenances, setFreeMaintenances] = useState<any[]>([]);
  const [paidMaintenances, setPaidMaintenances] = useState<any[]>([]);
  const [supportHistories, setSupportHistories] = useState<any[]>([]);

  const handleSuccess = () => {
    setCreationMode("none");
    setReloadTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (isMaintenanceTab(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getFreeMaintenanceList();
        if ((response.success === true || (response as any).result === "SUCCESS") && response.data) {
          const mappedData = response.data.map((item) => {
            const today = new Date();
            const endDate = item.endDate ? new Date(item.endDate) : null;
            let status = "진행중";
            if (endDate) {
              if (endDate < today) status = "종료";
              else if (endDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) status = "종료예정";
            }
            return {
              id: item.id.toString(),
              customer: item.customerName || "-",
              opportunity: item.projectName || "-",
              product: item.productFamilyName || "-",
              amount: (item.contractAmount || 0).toString(),
              startDate: item.startDate || "-",
              endDate: item.endDate || "-",
              salesRep: item.salesRepName || "-",
              manager: item.managerPrimaryName || "-",
              status: status,
              registeredAt: item.startDate || new Date().toISOString(),
            };
          });
          setFreeMaintenances(mappedData);
        }

        const paidResponse = await getPaidMaintenanceList();
        if ((paidResponse.success === true || (paidResponse as any).result === "SUCCESS") && paidResponse.data) {
          const mappedPaidData = paidResponse.data.map((item) => {
            const today = new Date();
            const endDate = item.endDate ? new Date(item.endDate) : null;
            let status = "진행중";
            if (endDate) {
              if (endDate < today) status = "종료";
              else if (endDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) status = "종료예정";
            }
            return {
              id: item.id.toString(),
              customer: item.customerName || "-",
              opportunity: item.projectName || "-",
              product: item.productFamilyName || "-",
              amount: (item.contractAmount || 0).toString(),
              startDate: item.startDate || "-",
              endDate: item.endDate || "-",
              inspectionMethod: item.inspectionMethod || "-",
              salesRep: item.salesRepName || "-",
              manager: item.managerPrimaryName || "-",
              status: status,
              registeredAt: item.startDate || new Date().toISOString(),
            };
          });
          setPaidMaintenances(mappedPaidData);
        }

        const supportResponse = await getSupportHistoryList();
        if ((supportResponse.success === true || (supportResponse as any).result === "SUCCESS") && supportResponse.data) {
          const mappedSupportData = supportResponse.data.map((item) => {
            return {
              id: item.id?.toString() || "N/A",
              customer: item.customerName || "-",
              recordType: item.dataType === "REQUEST" ? "request" : "result",
              requestType: item.activityCategory || "-",
              startDate: item.startAt ? item.startAt.replace("T", " ").substring(0, 16) : "-",
              endDate: item.endAt ? item.endAt.replace("T", " ").substring(0, 16) : "-",
              requester: item.dataType === "REQUEST" ? item.ownerName || "-" : "-",
              registrant: item.dataType === "ACTIVITY" ? item.ownerName || "-" : "-",
              salesRep: item.salesRepName || "-",
              supportRep: item.supportManagerName || "-",
              registeredAt: item.startAt || new Date().toISOString(),
            };
          });
          setSupportHistories(mappedSupportData);
        }
      } catch (error) {
        console.error("Failed to fetch maintenance lists:", error);
      }
    };
    fetchData();
  }, [reloadTrigger]);

  const maintenanceFieldOptions =
    activeTab === "free"
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
            { key: "customer", label: "고객사", options: uniqueOptions(supportHistories, (item) => item.customer) },
            {
              key: "type",
              label: "구분",
              options: [
                { label: "지원 요청", value: "request" },
                { label: "활동 결과", value: "result" },
              ],
            },
          ];
  const normalizedSearchTerm = appliedSearchTerm.trim().toLowerCase();
  const matchesSearch = (values: Array<string | number | null | undefined>) => {
    if (!normalizedSearchTerm) return true;
    return values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchTerm);
  };
  const filteredFreeMaintenances = filterRecords(freeMaintenances, filters, {
    status: (item) => item.status,
    owner: (item) => item.manager,
    date: (item) => item.startDate,
    fields: { customer: (item) => item.customer, product: (item) => item.product },
  })
    .filter((item) => matchesSearch([item.id, item.customer, item.opportunity, item.product, item.amount, item.startDate, item.endDate, item.salesRep, item.manager, item.status]))
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  const filteredPaidMaintenances = filterRecords(paidMaintenances, filters, {
    status: (item) => item.status,
    owner: (item) => item.manager,
    date: (item) => item.startDate,
    fields: { customer: (item) => item.customer, product: (item) => item.product },
  })
    .filter((item) =>
      matchesSearch([item.id, item.customer, item.opportunity, item.product, item.amount, item.startDate, item.endDate, item.inspectionMethod, item.salesRep, item.manager, item.status]),
    )
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  const filteredSupportHistories = filterRecords(supportHistories, filters, {
    date: (item) => item.registeredAt,
    fields: { customer: (item) => item.customer, type: (item) => item.recordType },
  })
    .filter((item) => matchesSearch([item.id, item.customer, item.recordType, item.requestType, item.startDate, item.endDate, item.requester, item.registrant, item.salesRep, item.supportRep]))
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  const maintenanceStatuses = ["진행중", "종료", "종료예정", "미체결", "완료", "예정"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="유지보수" description="무상/유상 유지보수 계약 및 고객 지원을 관리합니다" />
        <main className="flex-1 p-6 overflow-auto">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "free" | "paid" | "support");
              setCreationMode("none");
            }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="free" className="gap-2">
                  <Shield className="w-4 h-4" />
                  무상유지보수
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  유상유지보수
                </TabsTrigger>
                <TabsTrigger value="support" className="gap-2">
                  <HeadphonesIcon className="w-4 h-4" />
                  고객지원
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {creationMode === "none" ? (
                  <>
                    <PageSearchForm value={searchTerm} onChange={setSearchTerm} onSearch={() => setAppliedSearchTerm(searchTerm)} />
                    <FilterPopover title="유지보수" statusOptions={maintenanceStatuses} value={filters} onApply={setFilters} fieldOptions={maintenanceFieldOptions} />
                    {activeTab === "free" && (
                      <Button onClick={() => setCreationMode("free")}>
                        <Plus className="mr-2 w-4 h-4" /> 무상유지보수 등록
                      </Button>
                    )}
                    {activeTab === "paid" && (
                      <Button onClick={() => setCreationMode("paid")}>
                        <Plus className="mr-2 w-4 h-4" /> 유상유지보수 등록
                      </Button>
                    )}
                    {activeTab === "support" && (
                      <div className="flex gap-2">
                        <Button onClick={() => setCreationMode("request")}>
                          <Plus className="mr-2 w-4 h-4" /> 고객지원 요청 등록
                        </Button>
                        <Button onClick={() => setCreationMode("result")} variant="secondary">
                          <Plus className="mr-2 w-4 h-4" /> 고객지원 활동 결과 등록
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setCreationMode("none")}>
                    목록으로 돌아가기
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="free">
              {creationMode === "none" && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">무상유지보수 현황</CardTitle>
                      <Badge variant="secondary">{filteredFreeMaintenances.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredFreeMaintenances.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 무상유지보수 내역이 없습니다.</div>
                    ) : (
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
                    )}
                  </CardContent>
                </Card>
              )}
              {creationMode === "free" && <FreeMaintenanceForm onSuccess={handleSuccess} onCancel={() => setCreationMode("none")} inheritedData={null} />}
            </TabsContent>

            <TabsContent value="paid">
              {creationMode === "none" && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">유상유지보수 현황</CardTitle>
                      <Badge variant="secondary">{filteredPaidMaintenances.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredPaidMaintenances.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 유상유지보수 내역이 없습니다.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>고객사</TableHead>
                            <TableHead>사업기회</TableHead>
                            <TableHead>납품 제품</TableHead>
                            <TableHead className="text-right">계약 금액</TableHead>
                            <TableHead>계약개시일</TableHead>
                            <TableHead>계약종료일</TableHead>
                            <TableHead>점검 방법</TableHead>
                            <TableHead>영업대표</TableHead>
                            <TableHead>유지보수 담당자</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPaidMaintenances.map((item) => (
                            <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/maintenance/paid/${item.id}`)}>
                              <TableCell className="font-medium">{item.customer}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{item.opportunity}</TableCell>
                              <TableCell>{item.product}</TableCell>
                              <TableCell className="text-right font-medium">₩{parseInt(item.amount.replace(/,/g, "")).toLocaleString()}</TableCell>
                              <TableCell className="text-sm">{item.startDate}</TableCell>
                              <TableCell className="text-sm">{item.endDate}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {item.inspectionMethod}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.salesRep}</TableCell>
                              <TableCell>{item.manager}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
              {creationMode === "paid" && <PaidMaintenanceForm onSuccess={handleSuccess} onCancel={() => setCreationMode("none")} inheritedData={null} />}
            </TabsContent>

            <TabsContent value="support">
              {creationMode === "none" && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">고객지원 현황</CardTitle>
                      <Badge variant="secondary">{filteredSupportHistories.length}건</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredSupportHistories.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">등록된 고객지원 현황이 없습니다.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">구분</TableHead>
                            <TableHead>고객사</TableHead>
                            <TableHead>요청/활동구분</TableHead>
                            <TableHead>요청/등록자</TableHead>
                            <TableHead>영업대표</TableHead>
                            <TableHead>고객지원 담당자</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSupportHistories.map((item) => (
                            <TableRow key={`${item.recordType}-${item.id}`} className="hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/maintenance/${item.recordType === "request" ? "support-requests" : "support-activities"}/${item.id}`)}>
                              <TableCell>
                                <Badge
                                  variant={item.recordType === "request" ? "default" : "outline"}
                                  className={item.recordType === "request" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : "bg-purple-100 text-purple-700 hover:bg-purple-100"}
                                >
                                  {item.recordType === "request" ? "지원 요청" : "활동 결과"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{item.customer}</TableCell>
                              <TableCell>
                                {item.recordType === "request" ? (
                                  "-"
                                ) : (
                                  <Badge variant="secondary" className="font-normal text-xs">
                                    {item.requestType}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{item.recordType === "request" ? item.requester : item.registrant}</TableCell>
                              <TableCell>{item.salesRep}</TableCell>
                              <TableCell>{item.supportRep}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
              {creationMode === "request" && <SupportRequestForm onSuccess={handleSuccess} onCancel={() => setCreationMode("none")} />}
              {creationMode === "result" && <SupportResultForm onSuccess={handleSuccess} onCancel={() => setCreationMode("none")} />}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
