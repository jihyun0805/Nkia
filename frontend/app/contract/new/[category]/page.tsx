"use client";

import { use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { orderReportSchema, type OrderReportValues } from "@/lib/validations/order-report";
import { OrderBasicSection } from "@/components/erp/contract/order/OrderBasicSection";
import { OrderContractSection } from "@/components/erp/contract/order/OrderContractSection";
import { OrderScopeSection } from "@/components/erp/contract/order/OrderScopeSection";
import { OrderDetailTables } from "@/components/erp/contract/order/OrderDetailTables";

export default function ContractCategoryNewPage({ params }: { params: Promise<{ category: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const category = unwrappedParams.category;

  const form = useForm<OrderReportValues>({
    resolver: zodResolver(orderReportSchema),
    defaultValues: {
      projectName: "",
      totalAmount: "",
    },
  });

  // 프론트엔드 제출 핸들러 (콘솔 확인용 - 백엔드 로직 없음)
  const onSubmit = (data: OrderReportValues) => {
    console.log("제출된 수주보고서 데이터:", data);
    alert("프론트엔드 검증 완료! 콘솔(F12)을 확인하세요.");
  };

  // category가 'orders' (수주보고서)일 때만 해당 폼 보여줌
  const isOrderReport = category === "orders";

  return (
    <div className="flex-1 p-6 bg-slate-50 min-h-screen">
      <Card className="max-w-5xl mx-auto shadow-md border-0">
        <CardHeader className="border-b bg-white rounded-t-xl pb-6">
          <CardTitle className="text-2xl font-bold">{isOrderReport ? "수주보고서 등록" : "계약 등록"}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2"></p>
        </CardHeader>

        <CardContent className="pt-8 bg-white rounded-b-xl">
          {isOrderReport ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                {/* 기본 정보 및 매출분류 */}
                <OrderBasicSection />

                {/* 계약 및 담당자 일정 정보 */}
                <OrderContractSection />

                {/* 사업범위 및 첨부 */}
                <OrderScopeSection />

                {/* 세부 내역 테이블 (라이선스, 용역 등) */}
                <OrderDetailTables />

                {/* 하단 버튼 영역 */}
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
          ) : (
            <div className="text-center py-20 text-muted-foreground">수주보고서(orders) 외의 다른 계약 카테고리 폼 영역입니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
