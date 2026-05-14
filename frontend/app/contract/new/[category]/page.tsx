"use client";

import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { orderReportSchema, type OrderReportValues } from "@/lib/validations/order-report";
import { OrderBasicSection } from "@/components/erp/contract/order/OrderBasicSection";
import { OrderContractSection } from "@/components/erp/contract/order/OrderContractSection";
import { OrderScopeSection } from "@/components/erp/contract/order/OrderScopeSection";
import { OrderDetailTables } from "@/components/erp/contract/order/OrderDetailTables";
import { ProjectOpportunitySelector } from "@/components/erp/contract/order/ProjectOpportunitySelector";
import { orderReportApi } from "@/lib/api/contract-api";
import { loadBackendFindingData } from "@/lib/finding-backend";

export default function ContractCategoryNewPage({ params }: { params: Promise<{ category: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get("opportunityId");
  const unwrappedParams = use(params);
  const category = unwrappedParams.category;
  const [selectedOppId, setSelectedOppId] = useState<number | null>(opportunityId ? Number(opportunityId) : null);

  const form = useForm<OrderReportValues>({
    resolver: zodResolver(orderReportSchema),
    defaultValues: {
      projectName: "",
      totalAmount: "",
      salesClassification: {
        ems: "0",
        emsMaintenance: "0",
        itg: "0",
        itgMaintenance: "0",
        dashboard: "0",
        ito: "0",
        aiotion: "0",
        others: "0",
        verification: "0",
      },
      attachments: {
        quotation: "N",
        contract: "N",
        purchaseOrder: "N",
        prbReport: "N",
        others: "",
      },
    },
  });

  // 사업기회 데이터 승계 로직 분리
  const handleSelectOpportunity = (opp: any) => {
    setSelectedOppId(opp.backendId);
    form.reset({
      ...form.getValues(),
      projectName: opp.name,
      totalAmount: opp.expectedAmount.replace(/,/g, ""),
      pmName: opp.registrant,
      finalCustomer: { name: opp.customer },
      type: opp.product === "EMS" ? "SOLUTION" : opp.product === "MAINTENANCE" ? "MAINTENANCE" : "SERVICE",
    });
  };

  // 초기 렌더링 시 쿼리 파라미터가 있으면 데이터 로드
  useEffect(() => {
    if (opportunityId && category === "orders") {
      const fetchOpp = async () => {
        try {
          const data = await loadBackendFindingData();
          const opp = data.opportunities.find((o) => o.backendId === Number(opportunityId));
          if (opp) {
            handleSelectOpportunity(opp);
          }
        } catch (e) {
          console.error("Failed to fetch opportunity for inheritance:", e);
        }
      };
      fetchOpp();
    }
  }, [opportunityId, category]);

  const onSubmit = async (values: OrderReportValues) => {
    try {
      console.log("Submitting Order Report:", values);

      const requestData: any = {
        type: values.type || "SOLUTION",
        quotationProvided: values.attachments?.quotation === "Y",
        contractProvided: values.attachments?.contract === "Y",
        purchaseOrderProvided: values.attachments?.purchaseOrder === "Y",
        prbReportProvided: values.attachments?.prbReport === "Y",
        paymentCondition: values.paymentTerms || "",
        additionalDocuments: values.attachments?.others || "",
        channel: values.hasChannel === "Y",
        codeType: values.codeClassification || "GN",
        contractDate: values.contractDate || new Array(3).fill(0).map(() => new Date().toISOString().split("T")[0])[0],
        contractStartDate: values.startDate || null,
        contractEndDate: values.endDate || null,
        contractPeriodMonths: 0,
        scopeOfWork: values.businessScope || "",
        remarks: values.specialNotes || "",
        projectOpportunityId: selectedOppId || 0,
      };

      const res = await orderReportApi.createOrderReport(requestData);

      if (res.success || res.result === "SUCCESS") {
        alert("수주보고서가 성공적으로 등록되었습니다.");
        router.push("/contract");
      } else {
        alert(`등록 실패: ${res.message}`);
      }
    } catch (e: any) {
      console.error("Submission error:", e);
      alert(`오류가 발생했습니다: ${e.message}`);
    }
  };

  const isOrderReport = category === "orders";

  return (
    <div className="flex-1 p-6 bg-slate-50 min-h-screen">
      <Card className="max-w-5xl mx-auto shadow-md border-0">
        <CardHeader className="border-b bg-white rounded-t-xl pb-6">
          <CardTitle className="text-2xl font-bold">{isOrderReport ? "수주보고서 등록" : "계약 등록"}</CardTitle>
        </CardHeader>

        <CardContent className="pt-8 bg-white rounded-b-xl">
          {isOrderReport ? (
            <>
              {/* 사업기회 선택 섹션 */}
              <ProjectOpportunitySelector onSelect={handleSelectOpportunity} selectedId={selectedOppId || undefined} />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  <OrderBasicSection />
                  <OrderContractSection />
                  <OrderScopeSection />
                  <OrderDetailTables />

                  <div className="flex justify-end gap-3 border-t pt-8 mt-12">
                    <Button type="button" variant="outline" className="w-24" onClick={() => router.back()}>
                      취소
                    </Button>
                    <Button type="submit" className="w-24">
                      등록
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">수주보고서(orders) 외의 다른 계약 카테고리 폼 영역입니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
