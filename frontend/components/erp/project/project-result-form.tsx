"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, AlertCircle, Link as LinkIcon, Search } from "lucide-react";
import { projectApi, type ProjectDetailResponse } from "@/lib/api/project-api";
import { OrderReportSelector } from "@/components/erp/contract/order-report-selector";
import { orderReportApi, projectOpportunityApi, type OrderReportListResponse } from "@/lib/api/contract-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectResultFormProps {
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
    salesRep?: string;
    projectAmount?: string;
    [key: string]: any;
  } | null;
}

interface FormValues {
  customerName: string;
  projectName: string;
  projectAmount: string;
  startDate: string;
  endDate: string;
  pmName: string;
  salesRep: string;
}

export function ProjectResultForm({ onSuccess, onCancel, inheritedData }: ProjectResultFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProject, setCreatedProject] = useState<ProjectDetailResponse | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<"register" | "complete">("register");
  const [selectedReport, setSelectedReport] = useState<OrderReportListResponse | null>(null);

  // 현재 유효한 데이터 (상속된 데이터 또는 직접 선택한 데이터)
  const currentCustomerName = selectedReport?.finalCustomerCompanyName || inheritedData?.customerName || "";
  const currentProjectName = selectedReport?.projectName || inheritedData?.projectName || inheritedData?.opportunityName || "";
  const currentOrderReportId = selectedReport?.id || inheritedData?.orderReportId || "";
  const currentContractId = inheritedData?.contractId || "";
  const currentPmName = selectedReport?.pmName || inheritedData?.pmName || "";
  const currentSalesRep = inheritedData?.salesRep || "";
  const currentProjectAmount = selectedReport?.totalAmount?.toString() || inheritedData?.projectAmount || "";

  const { register, handleSubmit, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      customerName: currentCustomerName,
      projectName: currentProjectName,
      projectAmount: currentProjectAmount ? Number(currentProjectAmount).toLocaleString() : "",
      startDate: "",
      endDate: "",
      pmName: currentPmName,
      salesRep: currentSalesRep,
    },
  });

  // 선택 시 폼 업데이트
  const handleSelectReport = async (report: OrderReportListResponse) => {
    setSelectedReport(report);
    setValue("customerName", report.finalCustomerCompanyName || "");
    setValue("projectName", report.projectName || "");
    setValue("projectAmount", report.totalAmount?.toLocaleString() || "");
    setValue("pmName", report.pmName || "");
    setValue("salesRep", ""); // TODO : 영업대표 정보는 수주보고서 목록에 없으므로 초기화 / 나중에 추가

    try {
      const res = await orderReportApi.getOrderReport(report.id);
      const detail = res.data;
      if (detail.contractStartDate) setValue("startDate", detail.contractStartDate);
      if (detail.contractEndDate) setValue("endDate", detail.contractEndDate);

      if (!report.finalCustomerCompanyName && detail.finalCustomerCompanyName) {
        setValue("customerName", detail.finalCustomerCompanyName);
      }

      if (detail.projectOpportunityId) {
        try {
          const oppRes = await projectOpportunityApi.getProjectOpportunity(detail.projectOpportunityId);
          if (oppRes.data.salesRepresentativeName) {
            setValue("salesRep", oppRes.data.salesRepresentativeName);
          }
        } catch (oppErr) {
          console.error("Failed to fetch project opportunity details", oppErr);
        }
      }
    } catch (err) {
      console.error("Failed to fetch order report details", err);
    }
  };

  // 필수 데이터 체크
  const isDataMissing = !currentOrderReportId;

  useEffect(() => {
    if (isDataMissing) {
      console.warn("필수 연계 데이터(수주보고서)가 누락되었습니다.");
    }
  }, [isDataMissing]);

  // orderReportId 숫자 변환 헬퍼
  const getNumericOrderReportId = () => {
    const id = currentOrderReportId;
    if (!id) return null;
    const num = typeof id === "string" ? parseInt(id.replace(/\D/g, "")) : id;
    return isNaN(num) ? null : num;
  };

  // 사업 등록 (수주보고서 ID 기반)
  const onSubmit = async (_data: FormValues) => {
    const orderReportId = getNumericOrderReportId();
    if (!orderReportId) {
      alert("수주보고서 정보가 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await projectApi.createProject({ orderReportId });
      // 생성된 사업 상세 조회
      const detail = await projectApi.getProject(res.data.id);
      setCreatedProject(detail.data);
      setUploadStep("complete");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "사업 등록에 실패했습니다. 다시 시도해주세요.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 결과보고서 파일 업로드, 사업 업데이트
  const handleUploadAndComplete = async () => {
    if (!createdProject) {
      onSuccess();
      return;
    }

    // 파일 업로드 없이 완료 가능
    onSuccess();
  };

  // 완료 단계 UI
  if (uploadStep === "complete" && createdProject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>사업 등록 완료</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4 text-sm text-green-700 dark:text-green-300">
            사업이 성공적으로 등록되었습니다.
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">사업번호</p>
              <p className="font-medium">{createdProject.pjtNumber ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">사업명</p>
              <p className="font-medium">{createdProject.pjtName ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">고객사</p>
              <p className="font-medium">{createdProject.customerName ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">사업금액</p>
              <p className="font-medium">{createdProject.totalAmount != null ? `₩${createdProject.totalAmount.toLocaleString()}` : "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">사업개시일</p>
              <p className="font-medium">{createdProject.startDate ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">사업완료일</p>
              <p className="font-medium">{createdProject.endDate ?? "-"}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">* 사업 상세 정보(PM, 영업대표, 기간, 결과보고서)는 사업 상세 페이지에서 추가로 등록할 수 있습니다.</p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              목록으로
            </Button>
            <Button onClick={handleUploadAndComplete}>완료</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 등록 단계 UI
  return (
    <div className="space-y-6">
      {/* 승계 정보 요약 카드 */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <ExternalLink className="w-4 h-4" />
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
          <CardTitle>사업 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* 고객사 */}
              <div className="space-y-2">
                <Label htmlFor="customerName">고객사</Label>
                <Input id="customerName" {...register("customerName")} readOnly className="bg-muted" placeholder="수주보고서에서 자동 연동" />
              </div>

              {/* 사업명 */}
              <div className="space-y-2">
                <Label htmlFor="projectName">사업명</Label>
                <Input id="projectName" {...register("projectName")} readOnly className="bg-muted" placeholder="수주보고서에서 자동 연동" />
              </div>

              {/* 사업금액 */}
              <div className="space-y-2">
                <Label htmlFor="projectAmount">사업금액</Label>
                <Input id="projectAmount" type="text" {...register("projectAmount")} readOnly className="bg-muted" placeholder="수주보고서에서 자동 연동" />
              </div>

              {/* 사업개시일 */}
              <div className="space-y-2">
                <Label htmlFor="startDate">사업개시일</Label>
                <Input id="startDate" type="date" {...register("startDate")} readOnly className="bg-muted" placeholder="수주보고서에서 자동 연동" />
              </div>

              {/* 사업완료일 */}
              <div className="space-y-2">
                <Label htmlFor="endDate">사업완료일</Label>
                <Input id="endDate" type="date" {...register("endDate")} readOnly className="bg-muted" placeholder="수주보고서에서 자동 연동" />
              </div>

              {/* PM 이름 */}
              <div className="space-y-2">
                <Label htmlFor="pmName">PM 이름</Label>
                <Input id="pmName" {...register("pmName")} readOnly className="bg-muted" placeholder="수주보고서에서 자동 연동" />
              </div>

              {/* 영업대표 */}
              <div className="space-y-2">
                <Label htmlFor="salesRep">영업대표</Label>
                <Input id="salesRep" {...register("salesRep")} readOnly className="bg-muted" placeholder="수주보고서에서 자동 연동" />
              </div>
            </div>

            {/* 안내 */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4 text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• 수주보고서 ID를 기반으로 사업이 등록됩니다.</p>
              <p>• PM, 영업대표 배정 및 결과보고서 첨부는 등록 후 상세 페이지에서 진행합니다.</p>
            </div>

            {/* 관련 문서 링크 */}
            <div className="bg-muted/50 p-4 rounded-md space-y-3 border">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                관련 문서 참고
              </h4>
              <div className="flex gap-4 text-sm">
                <Link href="/contract?tab=orders" className="text-blue-600 hover:underline flex items-center gap-1">
                  수주보고서 ({inheritedData?.orderReportId || "미등록"})
                </Link>
                {inheritedData?.contractId && (
                  <Link href="/contract?tab=contracts" className="text-blue-600 hover:underline flex items-center gap-1">
                    계약 ({inheritedData.contractId})
                  </Link>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || isDataMissing}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  "등록"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
