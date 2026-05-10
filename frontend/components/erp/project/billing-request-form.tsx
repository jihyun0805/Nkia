"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface BillingRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  inheritedData?: {
    customerId?: string;
    customerName?: string;
    opportunityId?: string;
    opportunityName?: string;
    orderReportId?: string;
    contractId?: string;
    projectName?: string;
    [key: string]: any;
  } | null;
}

export function BillingRequestForm({ onSuccess, onCancel, inheritedData }: BillingRequestFormProps) {
  useEffect(() => {
    // 고객사(코드), 사업기회(코드), 수주보고서(코드)가 등록되지 않았다면 진행 불가
    if (!inheritedData?.customerId || !inheritedData?.opportunityId || !inheritedData?.orderReportId) {
      alert("고객사, 사업기회 또는 수주보고서가 등록되지 않았습니다. 먼저 등록을 진행해주십시오.");
      onCancel();
    }
  }, [inheritedData, onCancel]);

  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      customerName: inheritedData?.customerName || "",
      projectName: inheritedData?.projectName || inheritedData?.opportunityName || "",
      billingAmount: "",
      desiredIssueDate: "",
      issueDate: "", // 나중에 입력됨
      collectionDate: "", // 나중에 입력됨
      requestDate: today,
      requester: "현재 사용자", // 실제 구현 시 로그인된 사용자 정보 사용
      notes: "",
      taxInvoiceFile: null, // 나중에 업로드됨
    },
  });

  const onSubmit = (data: any) => {
    console.log("제출된 세금계산서 발행 요청 데이터:", data);
    alert("세금계산서 발행 요청이 등록되었습니다.");
    onSuccess();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>세금계산서 발행 요청</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 1. 고객사 */}
            <div className="space-y-2">
              <Label htmlFor="customerName">고객사</Label>
              <Input
                id="customerName"
                {...register("customerName", { required: true })}
                readOnly
                className="bg-muted"
                placeholder="고객사 입력"
              />
            </div>

            {/* 2. 사업명 */}
            <div className="space-y-2">
              <Label htmlFor="projectName">사업명</Label>
              <Input
                id="projectName"
                {...register("projectName", { required: true })}
                placeholder="사업명 입력"
              />
            </div>

            {/* 3. 청구 금액 */}
            <div className="space-y-2">
              <Label htmlFor="billingAmount">청구 금액</Label>
              <Input
                id="billingAmount"
                type="text"
                {...register("billingAmount", {
                  required: true,
                  onChange: (e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    const formatted = value ? Number(value).toLocaleString() : "";
                    setValue("billingAmount", formatted, { shouldValidate: true, shouldDirty: true });
                  }
                })}
                placeholder="청구 금액 입력"
              />
            </div>

            {/* 4. 세금계산서 발행 희망일 */}
            <div className="space-y-2">
              <Label htmlFor="desiredIssueDate">세금계산서 발행 희망일</Label>
              <Input
                id="desiredIssueDate"
                type="date"
                {...register("desiredIssueDate", { required: true })}
              />
            </div>

            {/* 5. 세금계산서 발행일 (나중에 입력) */}
            <div className="space-y-2">
              <Label htmlFor="issueDate">세금계산서 발행일</Label>
              <Input
                id="issueDate"
                type="date"
                {...register("issueDate")}
                disabled
                placeholder="세금계산서 발행 담당자가 나중에 입력"
                title="세금계산서 발행 담당자가 나중에 입력합니다."
              />
            </div>

            {/* 6. 수금일 (나중에 입력) */}
            <div className="space-y-2">
              <Label htmlFor="collectionDate">수금일</Label>
              <Input
                id="collectionDate"
                type="date"
                {...register("collectionDate")}
                disabled
                placeholder="수금 확인 담당자가 나중에 입력"
                title="수금 확인 담당자가 나중에 입력합니다."
              />
            </div>

            {/* 7. 요청일 (자동 입력) */}
            <div className="space-y-2">
              <Label htmlFor="requestDate">요청일</Label>
              <Input
                id="requestDate"
                type="date"
                {...register("requestDate")}
                readOnly
                className="bg-muted"
              />
            </div>

            {/* 8. 요청자 (자동 입력) */}
            <div className="space-y-2">
              <Label htmlFor="requester">요청자</Label>
              <Input
                id="requester"
                {...register("requester")}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* 9. 특기사항 */}
          <div className="space-y-2">
            <Label htmlFor="notes">특기사항</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="특기사항을 입력해주십시오."
              rows={3}
            />
          </div>

          {/* 10. 세금계산서 등록 (나중에 입력) */}
          <div className="space-y-2">
            <Label htmlFor="taxInvoiceFile">세금계산서 등록 (발행 후 업로드)</Label>
            <Input
              id="taxInvoiceFile"
              type="file"
              {...register("taxInvoiceFile")}
              disabled
              title="세금계산서 발행 담당자가 나중에 세금계산서 이미지를 업로드합니다."
            />
            <p className="text-sm text-muted-foreground mt-1">
              * 세금계산서 발행 담당자가 나중에 세금계산서 이미지를 업로드합니다.
            </p>
          </div>

          {/* 관련 문서 링크 (참고용) */}
          <div className="bg-muted/50 p-4 rounded-md space-y-3 mt-6 border">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              관련 문서 참고
            </h4>
            <div className="flex gap-4 text-sm">
              <Link
                href="/contract?tab=orders"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                수주보고서 ({inheritedData?.orderReportId || "미등록"})
              </Link>
              {inheritedData?.contractId && (
                <Link
                  href="/contract?tab=contracts"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  계약 ({inheritedData.contractId})
                </Link>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit">세금계산서 발행 요청</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
