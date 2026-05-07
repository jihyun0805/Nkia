"use client";

import { FormProvider, useForm } from "react-hook-form";
import { OrderBasicSection } from "@/components/erp/contract/order/OrderBasicSection";
import { OrderContractSection } from "./order/OrderContractSection";

import { Button } from "@/components/ui/button";
import { OrderScopeSection } from "./order/OrderScopeSection";
import { OrderDetailTables } from "./order/OrderDetailTables";

interface OrderReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
    [key: string]: any;
  } | null;
}

import { useEffect } from "react";

export function OrderReportForm({ onSuccess, onCancel, inheritedData }: OrderReportFormProps) {
  useEffect(() => {
    // 고객사(코드), 사업기회(코드)가 등록되지 않았다면 수주보고 등록 진행 불가
    if (!inheritedData?.customerId || !inheritedData?.opportunityId) {
      alert("고객사(코드) 또는 사업기회(코드)가 등록되지 않았습니다. 먼저 등록을 진행해주십시오.");
      onCancel();
    }
  }, [inheritedData, onCancel]);

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
      // 추가적인 섹션의 데이터가 있다면 여기에 작성
    },
  });

  const onSubmit = (data: any) => {
    console.log("제출된 데이터:", data);
    // TODO: 수주보고 API POST 요청 로직
    alert("수주보고가 등록되었습니다.");
    onSuccess(); // 등록 성공 시 목록 뷰로 돌아감
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8 bg-card rounded-lg border p-6">
        <OrderBasicSection />
        <OrderContractSection />
        <OrderScopeSection />
        <OrderDetailTables />

        <div className="flex justify-end gap-3 mt-8">
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit">등록</Button>
        </div>
      </form>
    </FormProvider>
  );
}
