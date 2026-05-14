"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSearchForm } from "@/components/erp/page-search-form";
import { Plus, FileCheck, BookKey, Receipt, ClipboardList, Wrench } from "lucide-react";
import { OrderReportList } from "@/components/erp/contract/order-report-list";
import { ContractList } from "@/components/erp/contract/contract-list";
import { LicenseList } from "@/components/erp/contract/license-list";
import { OrderReportForm } from "@/components/erp/contract/order-report-form";
import { ContractForm } from "@/components/erp/contract/contract-form";
import { PurchaseForm } from "@/components/erp/contract/purchase-form";
import { FreeMaintenanceForm } from "@/components/erp/contract/free-maintenance-form";
import { PaidMaintenanceForm } from "@/components/erp/contract/paid-maintenance-form";
import { LicenseRequestForm } from "@/components/erp/contract/license-request-form";
import { PurchaseList } from "@/components/erp/contract/purchase-list";
import { orderReportApi, contractApi, licenseApi, type OrderReportListResponse, type ContractListResponse, type LicenseListResponse } from "@/lib/api/contract-api";
import { toast } from "sonner";

type ActiveTab = "orders" | "contracts" | "purchases" | "licenses" | "maintenance";

export default function ContractPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("orders");
  const [isCreating, setIsCreating] = useState<boolean | "free" | "paid">(false);

  // API 데이터 상태
  const [orderReports, setOrderReports] = useState<OrderReportListResponse[]>([]);
  const [contracts, setContracts] = useState<ContractListResponse[]>([]);
  const [licenses, setLicenses] = useState<LicenseListResponse[]>([]);

  // 로딩 상태
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  // 수주보고서 목록 조회
  const fetchOrderReports = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await orderReportApi.getOrderReports();
      setOrderReports(res.data ?? []);
    } catch {
      toast.error("수주보고서 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // 계약 목록 조회
  const fetchContracts = useCallback(async () => {
    setLoadingContracts(true);
    try {
      const res = await contractApi.getContracts();
      setContracts(res.data ?? []);
    } catch {
      toast.error("계약 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingContracts(false);
    }
  }, []);

  // 라이선스 목록 조회
  const fetchLicenses = useCallback(async () => {
    setLoadingLicenses(true);
    try {
      const res = await licenseApi.getLicenses();
      setLicenses(res.data ?? []);
    } catch {
      toast.error("라이선스 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingLicenses(false);
    }
  }, []);

  // 탭 변경 시 해당 데이터 로드
  useEffect(() => {
    if (activeTab === "orders") fetchOrderReports();
    else if (activeTab === "contracts") fetchContracts();
    else if (activeTab === "licenses") fetchLicenses();
  }, [activeTab, fetchOrderReports, fetchContracts, fetchLicenses]);

  // 등록 완료 후 목록 새로고침
  const handleSuccess = () => {
    setIsCreating(false);
    if (activeTab === "orders") fetchOrderReports();
    else if (activeTab === "contracts") fetchContracts();
    else if (activeTab === "licenses") fetchLicenses();
  };

  // 검색 필터링
  const normalize = (s: string) => s.trim().toLowerCase();
  const search = normalize(appliedSearchTerm);

  const filteredOrderReports = orderReports.filter((i) => !search || [i.orderReportCode, i.projectName, i.pmName, i.finalCustomerCompanyName, i.contractDate].join(" ").toLowerCase().includes(search));

  const filteredContracts = contracts.filter((i) => !search || [i.salesRepresentativeName, i.contractDate, String(i.contractAmount)].join(" ").toLowerCase().includes(search));

  const filteredLicenses = licenses.filter((i) => !search || [i.customerCompanyName, i.productName, i.licenseType, i.licenseStatus].join(" ").toLowerCase().includes(search));

  const registerLabel = {
    orders: "수주보고 등록",
    contracts: "계약 등록",
    purchases: "매입계약 등록",
    licenses: "라이선스 발행 요청",
    maintenance: "",
  }[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="계약" description="수주 보고, 계약 관리 및 라이선스 발급을 관리합니다" />
        <main className="flex-1 overflow-auto p-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as ActiveTab);
              setIsCreating(false);
            }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="orders" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  수주보고
                </TabsTrigger>
                <TabsTrigger value="contracts" className="gap-2">
                  <FileCheck className="w-4 h-4" />
                  계약
                </TabsTrigger>
                <TabsTrigger value="purchases" className="gap-2">
                  <Receipt className="w-4 h-4" />
                  매입계약
                </TabsTrigger>
                <TabsTrigger value="licenses" className="gap-2">
                  <BookKey className="w-4 h-4" />
                  라이선스
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="gap-2">
                  <Wrench className="w-4 h-4" />
                  유지보수
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {activeTab !== "maintenance" && <PageSearchForm value={searchTerm} onChange={setSearchTerm} onSearch={() => setAppliedSearchTerm(searchTerm)} />}
                {!isCreating ? (
                  activeTab !== "maintenance" && (
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="mr-2 w-4 h-4" />
                      {registerLabel}
                    </Button>
                  )
                ) : (
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    목록으로 돌아가기
                  </Button>
                )}
              </div>
            </div>

            {/* 목록 뷰 */}
            {!isCreating ? (
              <>
                <TabsContent value="orders">
                  <OrderReportList reports={filteredOrderReports} isLoading={loadingOrders} />
                </TabsContent>
                <TabsContent value="contracts">
                  <ContractList contracts={filteredContracts} isLoading={loadingContracts} />
                </TabsContent>
                <TabsContent value="purchases">
                  {/* 매입계약은 별도 API가 없으므로 빈 상태 처리 */}
                  <PurchaseList purchases={[]} />
                </TabsContent>
                <TabsContent value="licenses">
                  <LicenseList licenses={filteredLicenses} isLoading={loadingLicenses} />
                </TabsContent>
                <TabsContent value="maintenance">
                  <div className="flex gap-6 min-h-[400px]">
                    <div className="bg-card rounded-lg border p-12 flex flex-1 flex-col items-center justify-center space-y-6">
                      <Wrench className="w-16 h-16 text-muted-foreground/50" />
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold">유지보수 계약 등록</h3>
                        <p className="text-muted-foreground">
                          유지보수 계약 현황 및 관리는 <strong>유지보수</strong> 페이지에서 확인할 수 있습니다.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <Button onClick={() => setIsCreating("free")} size="lg">
                          <Plus className="mr-2 w-5 h-5" /> 무상유지보수 계약 등록
                        </Button>
                        <Button onClick={() => setIsCreating("paid")} size="lg">
                          <Plus className="mr-2 w-5 h-5" /> 유상유지보수 계약 등록
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </>
            ) : activeTab === "orders" ? (
              <TabsContent value="orders">
                <OrderReportForm onSuccess={handleSuccess} onCancel={() => setIsCreating(false)} inheritedData={null} />
              </TabsContent>
            ) : activeTab === "contracts" ? (
              <TabsContent value="contracts">
                <ContractForm onSuccess={handleSuccess} onCancel={() => setIsCreating(false)} inheritedData={null} />
              </TabsContent>
            ) : activeTab === "purchases" ? (
              <TabsContent value="purchases">
                <PurchaseForm onSuccess={handleSuccess} onCancel={() => setIsCreating(false)} inheritedData={null} />
              </TabsContent>
            ) : activeTab === "maintenance" && isCreating === "free" ? (
              <TabsContent value="maintenance">
                <FreeMaintenanceForm onSuccess={handleSuccess} onCancel={() => setIsCreating(false)} inheritedData={null} />
              </TabsContent>
            ) : activeTab === "maintenance" && isCreating === "paid" ? (
              <TabsContent value="maintenance">
                <PaidMaintenanceForm onSuccess={handleSuccess} onCancel={() => setIsCreating(false)} inheritedData={null} />
              </TabsContent>
            ) : activeTab === "licenses" ? (
              <TabsContent value="licenses">
                <LicenseRequestForm onSuccess={handleSuccess} onCancel={() => setIsCreating(false)} inheritedData={null} />
              </TabsContent>
            ) : null}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
