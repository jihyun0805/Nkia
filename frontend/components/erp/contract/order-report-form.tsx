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
}

export function OrderReportForm({ onSuccess, onCancel }: OrderReportFormProps) {
  const methods = useForm({
    defaultValues: {
      projectName: "",
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
