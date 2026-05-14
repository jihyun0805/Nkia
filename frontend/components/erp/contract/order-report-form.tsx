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
  isEdit?: boolean;
  orderReportId?: number;
  initialData?: any;
}

export function OrderReportForm({ onSuccess, onCancel, inheritedData, isEdit, orderReportId, initialData }: OrderReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<number | null>(
    isEdit ? initialData?.projectOpportunityId : (inheritedData?.projectOpportunityId ?? (inheritedData?.opportunityId ? parseInt(inheritedData.opportunityId.replace(/\D/g, "")) : null)),
  );

  const formatNum = (num: any) => {
    if (num === null || num === undefined) return "";
    return Number(num).toLocaleString();
  };

  const methods = useForm({
    defaultValues: {
      projectName: isEdit ? initialData?.projectName : inheritedData?.opportunityName || "",
      finalCustomer: {
        name: isEdit ? initialData?.finalCustomerCompanyName : inheritedData?.customerName || "",
        companyId: isEdit ? initialData?.finalCustomerCompanyId : undefined,
        managerId: isEdit ? initialData?.finalCustomerManagerId : undefined,
      },
      contractPartner: {
        name: isEdit ? initialData?.contractCounterpartCompanyName : inheritedData?.customerName || "",
        companyId: isEdit ? initialData?.contractCounterpartCompanyId : undefined,
        managerId: isEdit ? initialData?.contractCounterpartManagerId : undefined,
      },
      pmId: isEdit ? initialData?.pmId : undefined,
      type: isEdit ? initialData?.type : "SOLUTION",
      codeType: isEdit ? initialData?.codeType : "GN",
      hasChannel: isEdit ? (initialData?.channel ? "Y" : "N") : "",
      contractDate: isEdit ? initialData?.contractDate : undefined,
      startDate: isEdit ? initialData?.contractStartDate : undefined,
      endDate: isEdit ? initialData?.contractEndDate : undefined,
      contractPeriodMonths: isEdit ? initialData?.contractPeriodMonths : undefined,
      freeMaintenancePeriod: isEdit ? initialData?.freeMaintenancePeriodMonths : undefined,
      scopeOfWork: isEdit ? initialData?.scopeOfWork : undefined,
      remarks: isEdit ? initialData?.remarks : undefined,
      quotationProvided: isEdit ? initialData?.quotationProvided : false,
      contractProvided: isEdit ? initialData?.contractProvided : false,
      purchaseOrderProvided: isEdit ? initialData?.purchaseOrderProvided : false,
      prbReportProvided: isEdit ? initialData?.prbReportProvided : false,
      additionalDocuments: isEdit ? initialData?.additionalDocuments : undefined,
      totalAmount: isEdit ? formatNum(initialData?.totalAmount) : "",
      vatType: "",
      paymentTerms: isEdit ? initialData?.paymentCondition : "",
      salesClassification: {
        ems: isEdit ? formatNum(initialData?.emsSummary) : "",
        itg: isEdit ? formatNum(initialData?.itgSummary) : "",
        dashboard: isEdit ? formatNum(initialData?.dashboardSummary) : "",
        aiotion: isEdit ? formatNum(initialData?.aiotionSummary) : "",
        emsMaintenance: isEdit ? formatNum(initialData?.emsMaintenanceSummary) : "",
        itgMaintenance: isEdit ? formatNum(initialData?.itgMaintenanceSummary) : "",
        ito: isEdit ? formatNum(initialData?.itoSummary) : "",
        others: isEdit ? formatNum(initialData?.otherSummary) : "",
        verification: "",
      },
      licenseDetails: isEdit
        ? initialData?.licenses?.map((l: any) => ({
            productModuleId: l.productModuleId,
            quantity: formatNum(l.quantity),
            productClass: l.productClass,
            productGroup: l.productGroup,
            productName: l.productName,
            price: formatNum(l.price),
            totalPrice: formatNum(l.totalPrice),
          }))
        : [],
      serviceDetails: isEdit
        ? initialData?.services?.map((s: any) => ({
            content: s.content,
            manMonth: formatNum(s.manMonth),
            price: formatNum(s.price),
            totalPrice: formatNum(s.totalPrice),
          }))
        : [],
      maintenanceDetails: isEdit
        ? initialData?.maintenances?.map((m: any) => ({
            content: m.content,
            visitCycle: m.visitCycle,
            month: formatNum(m.month),
            price: formatNum(m.price),
            totalPrice: formatNum(m.totalPrice),
          }))
        : [],
      otherSalesDetails: isEdit
        ? initialData?.others?.map((o: any) => ({
            content: o.content,
            quantity: formatNum(o.quantity),
            price: formatNum(o.price),
            totalPrice: formatNum(o.totalPrice),
          }))
        : [],
      purchaseDetails: isEdit
        ? initialData?.purchases?.map((p: any) => ({
            content: p.content,
            quantity: formatNum(p.quantity),
            price: formatNum(p.price),
            totalPrice: formatNum(p.totalPrice),
          }))
        : [],
      maintenanceOnlyItems: isEdit ? initialData?.maintenanceOnlyItems : [],
    },
  });

  const handleSelectOpportunity = (opp: any) => {
    setSelectedOppId(opp.backendId);
    methods.reset({
      ...methods.getValues(),
      projectName: opp.name,
      finalCustomer: { name: opp.customer, companyId: opp.customerCompanyId },
      contractPartner: { name: opp.customer, companyId: opp.customerCompanyId },
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
      type: formData.type || "SOLUTION",
      quotationProvided: formData.quotationProvided || false,
      contractProvided: formData.contractProvided || false,
      purchaseOrderProvided: formData.purchaseOrderProvided || false,
      prbReportProvided: formData.prbReportProvided || false,
      paymentCondition: formData.paymentTerms || "",
      additionalDocuments: formData.additionalDocuments,
      channel: formData.hasChannel === "Y",
      codeType: (formData.codeClassification || formData.codeType || "GN").replace("-", ""),
      contractDate: formData.contractDate || new Date().toISOString().split("T")[0],
      freeMaintenancePeriodMonths: formData.freeMaintenancePeriod ? parseInt(formData.freeMaintenancePeriod) : undefined,
      contractStartDate: formData.startDate || undefined,
      contractEndDate: formData.endDate || undefined,
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
      maintenances: (formData.maintenanceDetails || [])
        .filter((m: any) => m.content || m.monthlyAmount)
        .map((m: any) => {
          let vc = "MONTHLY";
          if (m.cycle === "월") vc = "MONTHLY";
          else if (m.cycle === "분기") vc = "QUARTERLY";
          else if (m.cycle === "반기") vc = "BIANNUAL";
          return {
            content: m.content || "",
            visitCycle: vc,
            month: parseInt(m.months) || 0,
            price: parseNum(m.monthlyAmount),
          };
        }),
      licenses: (formData.licenseDetails || [])
        .filter((l: any) => l.productModuleId)
        .map((l: any) => ({
          productModuleId: parseInt(l.productModuleId),
          quantity: parseInt(l.quantity) || 1,
        })),
      services: (formData.serviceDetails || [])
        .filter((s: any) => s.content || s.mm)
        .map((s: any) => ({
          content: s.content || "",
          manMonth: parseNum(s.mm),
          price: parseNum(s.unitPrice),
        })),
      maintenanceOnlyItems: (formData.maintenanceOnlyItems || [])
        .filter((i: any) => i.year || i.amount)
        .map((i: any) => ({
          year: parseInt(i.year) || 0,
          amount: parseNum(i.amount),
          license: parseNum(i.license),
          thirdParty: parseNum(i.thirdParty),
          service: parseNum(i.service),
          maintenance: parseNum(i.maintenance),
          maintenanceRate: parseFloat(i.maintenanceRate) || 0,
        })),
      others: (formData.otherSalesDetails || [])
        .filter((o: any) => o.content || o.quantity)
        .map((o: any) => ({
          content: o.content || "",
          quantity: parseInt(o.quantity) || 0,
          price: parseNum(o.unitPrice),
        })),
      purchases: (formData.purchaseDetails || [])
        .filter((p: any) => p.content || p.quantity)
        .map((p: any) => ({
          content: p.content || "",
          quantity: parseInt(p.quantity) || 0,
          price: parseNum(p.unitPrice),
        })),
    };

    setIsSubmitting(true);
    try {
      if (isEdit && orderReportId) {
        await orderReportApi.updateOrderReport(orderReportId, payload);
        toast.success("수주보고서가 수정되었습니다.");
      } else {
        await orderReportApi.createOrderReport(payload);
        toast.success("수주보고서가 등록되었습니다.");
      }
      onSuccess();
    } catch (error: any) {
      const message = error?.response?.data?.message || (isEdit ? "수주보고서 수정에 실패했습니다. 다시 시도해주세요." : "수주보고서 등록에 실패했습니다. 다시 시도해주세요.");
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
            {isEdit ? "수정" : "등록"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
