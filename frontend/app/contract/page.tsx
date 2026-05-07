"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterPopover } from "@/components/erp/filter-popover";
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils";
import { contracts, contractStatuses, licenses, orderReports, purchaseContracts, type PurchaseContract } from "@/lib/contract-data";
import { Plus, Search, FileCheck, BookKey, Receipt, ClipboardList, Wrench, Settings } from "lucide-react";
import { OrderReportList } from "@/components/erp/contract/order-report-list";
import { ContractList } from "@/components/erp/contract/contract-list";
import { PurchaseList } from "@/components/erp/contract/purchase-list";
import { LicenseList } from "@/components/erp/contract/license-list";
import { OrderReportForm } from "@/components/erp/contract/order-report-form";
import { ContractForm } from "@/components/erp/contract/contract-form";
import { PurchaseForm } from "@/components/erp/contract/purchase-form";
import { FreeMaintenanceForm } from "@/components/erp/contract/free-maintenance-form";
import { PaidMaintenanceForm } from "@/components/erp/contract/paid-maintenance-form";

export default function ContractPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues);
  const [activeTab, setActiveTab] = useState<"orders" | "contracts" | "purchases" | "licenses" | "maintenance">("orders");
  const [isCreating, setIsCreating] = useState<boolean | "free" | "paid">(false);
  const q = searchTerm.toLowerCase();

  useEffect(() => {
    if (isCreating) {
      const timer = setTimeout(() => {
        // 사업명 입력칸에 자동으로 포커스 이동
        const firstInput = document.querySelector('input[name="projectName"]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCreating]);

  const contractFieldOptions =
    activeTab === "orders"
      ? [{ key: "customer", label: "고객사", options: uniqueOptions(orderReports, (i) => i.customer) }]
      : activeTab === "contracts"
        ? [{ key: "customer", label: "고객사", options: uniqueOptions(contracts, (i) => i.customer) }]
        : activeTab === "purchases"
          ? [{ key: "supplier", label: "공급사", options: uniqueOptions(purchaseContracts, (i) => i.supplier) }]
          : activeTab === "licenses"
            ? [
                { key: "customer", label: "고객사", options: uniqueOptions(licenses, (i) => i.customer) },
                { key: "product", label: "제품", options: uniqueOptions(licenses, (i) => i.product) },
                { key: "type", label: "라이선스 유형", options: uniqueOptions(licenses, (i) => i.type) },
              ]
            : [];

  const filteredOrderReports = filterRecords(orderReports, filters, {
    status: (i) => i.approvalStatus,
    owner: (i) => i.salesRep,
    date: (i) => i.orderDate,
    fields: { customer: (i) => i.customer },
  })
    .filter((i) => [i.id, i.name, i.customer, i.product, i.salesRep].join(" ").toLowerCase().includes(q))
    // 가장 최근에 등록된 것부터 과거 순서로 배열
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  const filteredContracts = filterRecords(contracts, filters, { status: (i) => i.status, date: (i) => i.contractDate, fields: { customer: (i) => i.customer } })
    .filter((i) => [i.id, i.name, i.customer, i.orderId].join(" ").toLowerCase().includes(q))
    // 가장 최근에 등록된 것부터 과거 순서로 배열
    .sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime());

  const filteredPurchases = filterRecords(purchaseContracts, filters, {
    status: (i) => i.status,
    date: (i) => i.contractDate,
    fields: { supplier: (i) => i.supplier },
  })
    .filter((i) => [i.id, i.name, i.supplier, i.manager].join(" ").toLowerCase().includes(q))
    // 가장 최근에 등록된 계약부터 표시되도록 계약일 기준 내림차순 정렬
    .sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime());

  const filteredLicenses = filterRecords(licenses, filters, {
    status: (i) => i.status,
    date: (i) => i.issueDate,
    fields: { customer: (i) => i.customer, product: (i) => i.product, type: (i) => i.type },
  }).filter((i) => [i.id, i.customer, i.product, i.module].join(" ").toLowerCase().includes(q));
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="계약" description="수주 보고, 계약 관리 및 라이선스 발급을 관리합니다" />
        <main className="flex-1 overflow-auto p-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "orders" | "contracts" | "purchases" | "licenses" | "maintenance");
              setIsCreating(false); // 탭을 변경하면 목록화면으로 돌아가게 함
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
                {activeTab !== "maintenance" && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="검색..." className="w-64 pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={!!isCreating} />
                    </div>
                    <FilterPopover title="계약" statusOptions={contractStatuses} value={filters} onApply={setFilters} fieldOptions={contractFieldOptions} />
                  </>
                )}
                {!isCreating ? (
                  activeTab !== "maintenance" && (
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="mr-2 w-4 h-4" />
                      {activeTab === "orders" ? "수주보고 등록" : activeTab === "contracts" ? "계약 등록" : activeTab === "purchases" ? "매입계약 등록" : "라이선스 등록"}
                    </Button>
                  )
                ) : (
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    목록으로 돌아가기
                  </Button>
                )}
              </div>
            </div>

            {!isCreating ? (
              <>
                <TabsContent value="orders">
                  <OrderReportList reports={filteredOrderReports} />
                </TabsContent>
                <TabsContent value="contracts">
                  <ContractList contracts={filteredContracts} />
                </TabsContent>
                <TabsContent value="purchases">
                  <PurchaseList purchases={filteredPurchases} />
                </TabsContent>
                <TabsContent value="licenses">
                  <LicenseList licenses={filteredLicenses} />
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
                {/* TODO: 폼 컴포넌트의 제출/취소 완료 prop 이름(onSuccess, onSubmit 등)에 맞춰 연결 */}
                <OrderReportForm
                  onSuccess={() => setIsCreating(false)}
                  onCancel={() => setIsCreating(false)}
                  // TODO: 실제 환경에서는 선택된 사업기회/수주보고서 정보를 넘기거나, 없을 경우 null을 전달
                  inheritedData={{
                    customerId: "CUST-001",
                    customerName: "삼성전자",
                    opportunityId: "OPP-2026-001",
                    opportunityName: "삼성전자 EMS 구축",
                  }}
                />
              </TabsContent>
            ) : activeTab === "contracts" ? (
              <TabsContent value="contracts">
                <ContractForm
                  onSuccess={() => setIsCreating(false)}
                  onCancel={() => setIsCreating(false)}
                  // TODO: 실제 환경에서는 선택된 사업기회/수주보고서 정보를 넘기거나, 없을 경우 null을 전달
                  inheritedData={{
                    customerId: "CUST-001",
                    customerName: "삼성전자",
                    opportunityId: "OPP-2026-001",
                    opportunityName: "삼성전자 EMS 구축",
                    orderReportId: "ORD-2026-001",
                  }}
                />
              </TabsContent>
            ) : activeTab === "purchases" ? (
              <TabsContent value="purchases">
                <PurchaseForm
                  onSuccess={() => setIsCreating(false)}
                  onCancel={() => setIsCreating(false)}
                  // TODO: 실제 환경에서는 선택된 사업기회/수주보고서 정보를 넘기거나, 없을 경우 null을 전달
                  inheritedData={{
                    customerId: "CUST-001",
                    customerName: "삼성전자",
                    opportunityId: "OPP-2026-001",
                    opportunityName: "삼성전자 EMS 구축",
                    orderReportId: "ORD-2026-001",
                  }}
                />
              </TabsContent>
            ) : activeTab === "maintenance" && isCreating === "free" ? (
              <TabsContent value="maintenance">
                <FreeMaintenanceForm
                  onSuccess={() => setIsCreating(false)}
                  onCancel={() => setIsCreating(false)}
                  // TODO: 실제 환경에서는 선택된 사업기회/수주보고서 정보를 넘기거나, 없을 경우 null을 전달
                  inheritedData={{
                    customerId: "CUST-001",
                    customerName: "삼성전자",
                    opportunityId: "OPP-2026-001",
                    opportunityName: "삼성전자 EMS 구축",
                    orderReportId: "ORD-2026-001",
                    contractId: "CTR-2026-001",
                  }}
                />
              </TabsContent>
            ) : activeTab === "maintenance" && isCreating === "paid" ? (
              <TabsContent value="maintenance">
                <PaidMaintenanceForm
                  onSuccess={() => setIsCreating(false)}
                  onCancel={() => setIsCreating(false)}
                  // TODO: 실제 환경에서는 선택된 사업기회/수주보고서 정보를 넘기거나, 없을 경우 null을 전달
                  inheritedData={{
                    customerId: "CUST-001",
                    customerName: "삼성전자",
                    opportunityId: "OPP-2026-001",
                    opportunityName: "삼성전자 EMS 구축",
                    orderReportId: "ORD-2026-001",
                    contractId: "CTR-2026-001",
                  }}
                />
              </TabsContent>
            ) : (
              <TabsContent value={activeTab}>
                <div className="bg-card rounded-lg border p-6 flex min-h-[400px] flex-col items-center justify-center space-y-4">
                  <p className="text-muted-foreground text-lg">여기에 라이선스 등록 폼 컴포넌트</p>
                  <p className="text-sm text-muted-foreground">TODO: 컴포넌트 import</p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
