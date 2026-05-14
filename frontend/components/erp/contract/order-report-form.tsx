"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { OrderBasicSection } from "@/components/erp/contract/order/OrderBasicSection";
import { OrderContractSection } from "./order/OrderContractSection";
import { Button } from "@/components/ui/button";
import { OrderScopeSection } from "./order/OrderScopeSection";
import { OrderDetailTables } from "./order/OrderDetailTables";
import { orderReportApi, type OrderReportRequest } from "@/lib/api/contract-api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectOpportunitySelector } from "@/components/erp/contract/order/ProjectOpportunitySelector";

interface OrderReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
    projectOpportunityId?: number; // 백엔드 ID
    [key: string]: any;
  } | null;
}

export function OrderReportForm({ onSuccess, onCancel, inheritedData }: OrderReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<number | null>(
    inheritedData?.projectOpportunityId ?? (inheritedData?.opportunityId ? parseInt(inheritedData.opportunityId.replace(/\D/g, "")) : null),
  );

  const methods = useForm({
    defaultValues: {
      projectName: inheritedData?.opportunityName || "",
      finalCustomer: {
        name: inheritedData?.customerName || "",
      },
      contractPartner: {
        name: inheritedData?.customerName || "",
      },
      totalAmount: "",
      vatType: "",
      paymentTerms: "",
      salesClassification: {
        ems: "",
        itg: "",
        dashboard: "",
        aiotion: "",
        emsMaintenance: "",
        itgMaintenance: "",
        ito: "",
        others: "",
        verification: "",
      },
    },
  });

  const handleSelectOpportunity = (opp: any) => {
    setSelectedOppId(opp.backendId);
    methods.reset({
      ...methods.getValues(),
      projectName: opp.name,
      finalCustomer: { name: opp.customer },
      contractPartner: { name: opp.customer },
      // 기타 매핑 필요한 필드
    });
  };

  const onSubmit = async (formData: any) => {
    const projectOpportunityId = selectedOppId;

    if (!projectOpportunityId) {
      toast.error("사업기회를 선택해주세요.");
      return;
    }

    // 폼 데이터를 백엔드 요청 형식으로 변환
    const parseNum = (val: string | number | undefined) => {
      if (!val) return 0;
      return Number(String(val).replace(/,/g, "")) || 0;
    };

    const payload: OrderReportRequest = {
      type: formData.type || "NEW",
      quotationProvided: formData.quotationProvided || false,
      contractProvided: formData.contractProvided || false,
      purchaseOrderProvided: formData.purchaseOrderProvided || false,
      prbReportProvided: formData.prbReportProvided || false,
      paymentCondition: formData.paymentTerms || "",
      additionalDocuments: formData.additionalDocuments,
      channel: formData.channel || false,
      codeType: formData.codeType || "DIRECT",
      contractDate: formData.contractDate || new Date().toISOString().split("T")[0],
      freeMaintenancePeriodMonths: formData.freeMaintenancePeriodMonths ? parseInt(formData.freeMaintenancePeriodMonths) : undefined,
      contractStartDate: formData.contractStartDate,
      contractEndDate: formData.contractEndDate,
      contractPeriodMonths: formData.contractPeriodMonths ? parseInt(formData.contractPeriodMonths) : undefined,
      scopeOfWork: formData.scopeOfWork,
      remarks: formData.remarks,
      projectOpportunityId,
      pmId: formData.pmId,
      contractCounterpartManagerId: formData.contractPartner?.managerId ? parseInt(formData.contractPartner.managerId) : undefined,
      contractCounterpartCompanyId: formData.contractPartner?.companyId ? parseInt(formData.contractPartner.companyId) : undefined,
      finalCustomerCompanyId: formData.finalCustomer?.companyId ? parseInt(formData.finalCustomer.companyId) : undefined,
      finalCustomerManagerId: formData.finalCustomer?.managerId ? parseInt(formData.finalCustomer.managerId) : undefined,
      emsMaintenanceSummary: parseNum(formData.salesClassification?.emsMaintenance),
      itgMaintenanceSummary: parseNum(formData.salesClassification?.itgMaintenance),
      maintenances: (formData.maintenanceDetails || []).map((m: any) => ({
        content: m.content || "",
        visitCycle: m.visitCycle || "MONTHLY",
        month: parseInt(m.month) || 0,
        price: parseNum(m.price),
      })),
      licenses: (formData.licenseDetails || []).map((l: any) => ({
        productModuleId: parseInt(l.productModuleId) || 0,
        quantity: parseInt(l.quantity) || 1,
      })),
      services: (formData.serviceDetails || []).map((s: any) => ({
        content: s.content || "",
        manMonth: parseNum(s.manMonth),
        price: parseNum(s.price),
      })),
      maintenanceOnlyItems: (formData.maintenanceOnlyItems || []).map((i: any) => ({
        year: parseInt(i.year) || 0,
        amount: parseNum(i.amount),
        license: parseNum(i.license),
        thirdParty: parseNum(i.thirdParty),
        service: parseNum(i.service),
        maintenance: parseNum(i.maintenance),
        maintenanceRate: parseFloat(i.maintenanceRate) || 0,
      })),
      others: (formData.otherSalesDetails || []).map((o: any) => ({
        content: o.content || "",
        quantity: parseInt(o.quantity) || 0,
        price: parseNum(o.price),
      })),
      purchases: (formData.purchaseDetails || []).map((p: any) => ({
        content: p.content || "",
        quantity: parseInt(p.quantity) || 0,
        price: parseNum(p.price),
      })),
    };

    setIsSubmitting(true);
    try {
      await orderReportApi.createOrderReport(payload);
      toast.success("수주보고서가 등록되었습니다.");
      onSuccess();
    } catch (error: any) {
      const message = error?.response?.data?.message || "수주보고서 등록에 실패했습니다. 다시 시도해주세요.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="mb-6">
        <ProjectOpportunitySelector onSelect={handleSelectOpportunity} selectedId={selectedOppId || undefined} />
      </div>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8 bg-card rounded-lg border p-6">
        <OrderBasicSection />
        <OrderContractSection />
        <OrderScopeSection />
        <OrderDetailTables />

        <div className="flex justify-end gap-3 mt-8">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            등록
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
