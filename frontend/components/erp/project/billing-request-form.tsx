"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, AlertCircle, Link as LinkIcon, Search } from "lucide-react";
import { projectApi, type BillingFormInitResponse } from "@/lib/api/project-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderReportSelector } from "@/components/erp/contract/order-report-selector";
import { type OrderReportListResponse } from "@/lib/api/order-report-api";
import { UserPicker } from "@/components/erp/user-picker";
import { useBackendUsers } from "@/lib/use-backend-users";
import { type BackendUserSummary } from "@/lib/workflow-backend";

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
  const users = useBackendUsers();
  const [invoiceManager, setInvoiceManager] = useState<BackendUserSummary | null>(null);

  const [initData, setInitData] = useState<BillingFormInitResponse | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReport, setSelectedReport] = useState<OrderReportListResponse | null>(null);

  // 현재 유효한 데이터
  const currentCustomerName = initData?.customerName || selectedReport?.finalCustomerCompanyName || inheritedData?.customerName || "";
  const currentProjectName = initData?.projectName || selectedReport?.projectName || inheritedData?.projectName || inheritedData?.opportunityName || "";
  const currentOrderReportId = selectedReport?.id || inheritedData?.orderReportId || "";
  const currentContractId = initData?.contractId || inheritedData?.contractId || "";
  const currentRequester = initData?.requesterName || "";

  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      customerName: currentCustomerName,
      projectName: currentProjectName,
      billingAmount: "",
      requestedIssueDate: "",
      requestDate: today,
      requester: currentRequester,
      remarks: "",
    },
  });

  // 선택 시 폼 업데이트
  const handleSelectReport = (report: OrderReportListResponse) => {
    setSelectedReport(report);
    // API를 통해 초기화 데이터 다시 가져오기
    setInitLoading(true);
    projectApi
      .getBillingFormInit(report.id)
      .then((res) => {
        const data = res.data;
        setInitData(data);
        reset({
          customerName: data.customerName,
          projectName: data.projectName,
          billingAmount: "",
          requestedIssueDate: "",
          requestDate: data.requestDate || today,
          requester: data.requesterName,
          remarks: "",
        });
      })
      .catch(() => {
        setValue("customerName", report.finalCustomerCompanyName || "");
        setValue("projectName", report.projectName);
        setValue("requester", report.pmName || "");
      })
      .finally(() => setInitLoading(false));
  };

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

  // 등록 불가 조건 체크 (UX 개선)
  const isDataMissing = !currentOrderReportId;

  useEffect(() => {
    if (isDataMissing) {
      console.warn("필수 연계 데이터(수주보고서)가 누락되었습니다.");
    }
  }, [isDataMissing]);

  const onSubmit = async (data: FormValues) => {
    const orderReportId = currentOrderReportId;
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

    if (!invoiceManager?.id) {
      alert("세금계산서 발행 담당자를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await projectApi.createBilling({
        orderReportId: numericOrderReportId,
        billingAmount: amountNum,
        requestedIssueDate: data.requestedIssueDate,
        remarks: data.remarks || undefined,
        invoiceManager: invoiceManager.id,
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
    <div className="space-y-6">
      {/* 승계 정보 요약 카드 */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <LinkIcon className="w-4 h-4" />
            연계 정보 (승계 데이터)
          </CardTitle>
          {isDataMissing ? (
            <OrderReportSelector onSelect={handleSelectReport} />
          ) : (
            <OrderReportSelector
              onSelect={handleSelectReport}
              trigger={
                <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 p-0 text-xs gap-1">
                  <Search className="w-3 h-3" />
                  변경하기
                </Button>
              }
            />
          )}
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">고객사</p>
              <p className="font-semibold">{currentCustomerName || "미선택"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">사업명</p>
              <p className="font-semibold">{currentProjectName || "미선택"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">수주보고서 ID</p>
              <p className="font-semibold">{currentOrderReportId || "미선택"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-medium">계약 번호</p>
              <p className="font-semibold">{currentContractId || "미등록"}</p>
            </div>
          </div>
          {isDataMissing && (
            <p className="mt-3 text-[11px] text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              연계할 수주보고서를 선택해 주세요.
            </p>
          )}
        </CardContent>
      </Card>

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

              {/* 세금계산서 발행 담당자 */}
              <div className="space-y-2">
                <Label>세금계산서 발행 담당자 *</Label>
                <UserPicker
                  value={invoiceManager?.name ?? ""}
                  users={users}
                  onSelect={setInvoiceManager}
                  placeholder="담당자 지정"
                />
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
                  수주보고서 ({currentOrderReportId || "미등록"})
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
              <Button type="submit" disabled={isSubmitting || isDataMissing || !invoiceManager}>
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
    </div>
  );
}
