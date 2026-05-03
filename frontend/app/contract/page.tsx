"use client";

import Link from "next/link";
import { useState } from "react";
import { Sidebar } from "@/components/erp/sidebar";
import { Header } from "@/components/erp/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterPopover } from "@/components/erp/filter-popover";
import { defaultFilterValues, filterRecords, type FilterValues, uniqueOptions } from "@/lib/filter-utils";
import { contracts, contractStatuses, licenses, orderReports, purchaseContracts, type PurchaseContract } from "@/lib/contract-data";
import { Plus, Search, FileCheck, BookKey, Receipt, ClipboardList } from "lucide-react";
import { OrderReportList } from "@/components/erp/contract/order-report-list";
import { ContractList } from "@/components/erp/contract/contract-list";
import { PurchaseList } from "@/components/erp/contract/purchase-list";
import { LicenseList } from "@/components/erp/contract/license-list";
import { OrderReportForm } from "@/components/erp/contract/order-report-form";

export default function ContractPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterValues>(defaultFilterValues);
  const [activeTab, setActiveTab] = useState<"orders" | "contracts" | "purchases" | "licenses">("orders");
  const [isCreating, setIsCreating] = useState(false);
  const q = searchTerm.toLowerCase();

  const contractFieldOptions =
    activeTab === "orders"
      ? [{ key: "customer", label: "고객사", options: uniqueOptions(orderReports, (i) => i.customer) }]
      : activeTab === "contracts"
        ? [{ key: "customer", label: "고객사", options: uniqueOptions(contracts, (i) => i.customer) }]
        : activeTab === "purchases"
          ? [{ key: "supplier", label: "공급사", options: uniqueOptions(purchaseContracts, (i) => i.supplier) }]
          : [
              { key: "customer", label: "고객사", options: uniqueOptions(licenses, (i) => i.customer) },
              { key: "product", label: "제품", options: uniqueOptions(licenses, (i) => i.product) },
              { key: "type", label: "라이선스 유형", options: uniqueOptions(licenses, (i) => i.type) },
            ];

  const filteredOrderReports = filterRecords(orderReports, filters, {
    status: (i) => i.approvalStatus,
    owner: (i) => i.salesRep,
    date: (i) => i.orderDate,
    fields: { customer: (i) => i.customer },
  }).filter((i) => [i.id, i.name, i.customer, i.product, i.salesRep].join(" ").toLowerCase().includes(q));

  const filteredContracts = filterRecords(contracts, filters, { status: (i) => i.status, date: (i) => i.contractDate, fields: { customer: (i) => i.customer } }).filter((i) =>
    [i.id, i.name, i.customer, i.orderId].join(" ").toLowerCase().includes(q),
  );

  const filteredPurchases = filterRecords(purchaseContracts, filters, {
    status: (i) => i.status,
    date: (i) => i.contractDate,
    fields: { supplier: (i) => i.supplier },
  }).filter((i) => [i.id, i.name, i.supplier, i.manager].join(" ").toLowerCase().includes(q));

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
              setActiveTab(value as "orders" | "contracts" | "purchases" | "licenses");
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
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="검색..." className="w-64 pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isCreating} />
                </div>
                <FilterPopover title="계약" statusOptions={contractStatuses} value={filters} onApply={setFilters} fieldOptions={contractFieldOptions} />
                {!isCreating ? (
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="mr-2 w-4 h-4" />
                    {activeTab === "orders" ? "수주보고 등록" : activeTab === "contracts" ? "계약 등록" : activeTab === "purchases" ? "매입계약 등록" : "라이선스 등록"}
                  </Button>
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
              </>
            ) : activeTab === "orders" ? (
              <div className="mt-6">
                {/* TODO: 폼 컴포넌트의 제출/취소 완료 prop 이름(onSuccess, onSubmit 등)에 맞춰 연결 */}
                <OrderReportForm onSuccess={() => setIsCreating(false)} onCancel={() => setIsCreating(false)} />
              </div>
            ) : (
              <div className="bg-card rounded-lg border p-6 mt-6 flex min-h-[400px] flex-col items-center justify-center space-y-4">
                <p className="text-muted-foreground text-lg">여기에 {activeTab === "contracts" ? "계약" : activeTab === "purchases" ? "매입계약" : "라이선스"} 등록 폼 컴포넌트</p>
                <p className="text-sm text-muted-foreground">TODO: 컴포넌트 import</p>
              </div>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
