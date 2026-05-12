"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Loader2 } from "lucide-react";
import { projectApi, type BillingFormInitResponse } from "@/lib/api/project-api";

interface BillingRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
    orderReportId?: string | number;
    contractId?: string | number;
    projectName?: string;
    [key: string]: any;
  } | null;
}

interface FormValues {
  customerName: string;
  projectName: string;
  billingAmount: string;
  requestedIssueDate: string;
  requestDate: string;
  requester: string;
  remarks: string;
}

export function BillingRequestForm({ onSuccess, onCancel, inheritedData }: BillingRequestFormProps) {
  const [initData, setInitData] = useState<BillingFormInitResponse | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      customerName: inheritedData?.customerName ?? "",
      projectName: inheritedData?.projectName ?? inheritedData?.opportunityName ?? "",
      billingAmount: "",
      requestedIssueDate: "",
      requestDate: today,
      requester: "",
      remarks: "",
    },
  });

  // 수주보고서 ID가 있으면 백엔드에서 폼 초기 데이터 로딩
  useEffect(() => {
    const orderReportId = inheritedData?.orderReportId;
    if (!orderReportId) return;

    const numericId = typeof orderReportId === "string" ? parseInt(orderReportId.replace(/\D/g, "")) : orderReportId;
    if (!numericId || isNaN(numericId)) return;

    setInitLoading(true);
    projectApi
      .getBillingFormInit(numericId)
      .then((res) => {
        const data = res.data;
        setInitData(data);
        reset({
          customerName: data.customerName ?? "",
          projectName: data.projectName ?? "",
          billingAmount: "",
          requestedIssueDate: "",
          requestDate: data.requestDate ?? today,
          requester: data.requesterName ?? "",
          remarks: "",
        });
      })
      .catch(() => {
        // 초기화 실패 시 inheritedData 기본값 유지
      })
      .finally(() => setInitLoading(false));
  }, [inheritedData?.orderReportId]);

  // 등록 불가 조건 체크
  useEffect(() => {
    if (!inheritedData?.customerId || !inheritedData?.opportunityId || !inheritedData?.orderReportId) {
      alert("고객사, 사업기회 또는 수주보고서가 등록되지 않았습니다. 먼저 등록을 진행해주십시오.");
      onCancel();
    }
  }, [inheritedData, onCancel]);

  const onSubmit = async (data: FormValues) => {
    const orderReportId = inheritedData?.orderReportId;
    const numericOrderReportId = typeof orderReportId === "string" ? parseInt(orderReportId.replace(/\D/g, "")) : (orderReportId ?? 0);

    if (!numericOrderReportId) {
      alert("수주보고서 정보가 없습니다.");
      return;
    }

    const amountNum = parseInt(data.billingAmount.replace(/,/g, ""));
    if (!amountNum || amountNum <= 0) {
      alert("올바른 청구 금액을 입력해주세요.");
      return;
    }

    if (!data.requestedIssueDate) {
      alert("세금계산서 발행 희망일을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await projectApi.createBilling({
        orderReportId: numericOrderReportId,
        billingAmount: amountNum,
        requestedIssueDate: data.requestedIssueDate,
        remarks: data.remarks || undefined,
      });
      alert("세금계산서 발행 요청이 등록되었습니다.");
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "등록에 실패했습니다. 다시 시도해주세요.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          초기 데이터를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>세금계산서 발행 요청</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 고객사 */}
            <div className="space-y-2">
              <Label htmlFor="customerName">고객사</Label>
              <Input id="customerName" {...register("customerName", { required: true })} readOnly className="bg-muted" placeholder="고객사 입력" />
            </div>

            {/* 사업명 */}
            <div className="space-y-2">
              <Label htmlFor="projectName">사업명</Label>
              <Input id="projectName" {...register("projectName", { required: true })} readOnly className="bg-muted" placeholder="사업명" />
            </div>

            {/* 청구 금액 */}
            <div className="space-y-2">
              <Label htmlFor="billingAmount">청구 금액 *</Label>
              <Input
                id="billingAmount"
                type="text"
                {...register("billingAmount", {
                  required: true,
                  onChange: (e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    const formatted = value ? Number(value).toLocaleString() : "";
                    setValue("billingAmount", formatted, { shouldValidate: true, shouldDirty: true });
                  },
                })}
                placeholder="청구 금액 입력"
              />
            </div>

            {/* 세금계산서 발행 희망일 */}
            <div className="space-y-2">
              <Label htmlFor="requestedIssueDate">세금계산서 발행 희망일 *</Label>
              <Input id="requestedIssueDate" type="date" {...register("requestedIssueDate", { required: true })} />
            </div>

            {/* 요청일 */}
            <div className="space-y-2">
              <Label htmlFor="requestDate">요청일</Label>
              <Input id="requestDate" type="date" {...register("requestDate")} readOnly className="bg-muted" />
            </div>

            {/* 요청자 */}
            <div className="space-y-2">
              <Label htmlFor="requester">요청자</Label>
              <Input id="requester" {...register("requester")} readOnly className="bg-muted" placeholder="자동 입력" />
            </div>
          </div>

          {/* 특기사항 */}
          <div className="space-y-2">
            <Label htmlFor="remarks">특기사항</Label>
            <Textarea id="remarks" {...register("remarks")} placeholder="특기사항을 입력해주십시오." rows={3} />
          </div>

          {/* 안내 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• 세금계산서 발행일 및 발행 파일은 담당자가 발행 후 등록합니다.</p>
            <p>• 수금일은 수금 확인 담당자가 별도로 입력합니다.</p>
          </div>

          {/* 관련 문서 링크 */}
          <div className="bg-muted/50 p-4 rounded-md space-y-3 mt-2 border">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              관련 문서 참고
            </h4>
            <div className="flex gap-4 text-sm">
              <Link href="/contract?tab=orders" className="text-blue-600 hover:underline flex items-center gap-1">
                수주보고서 ({inheritedData?.orderReportId || "미등록"})
              </Link>
              {(initData?.contractId ?? inheritedData?.contractId) && (
                <Link href="/contract?tab=contracts" className="text-blue-600 hover:underline flex items-center gap-1">
                  계약 ({initData?.contractId ?? inheritedData?.contractId})
                </Link>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                "세금계산서 발행 요청"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
